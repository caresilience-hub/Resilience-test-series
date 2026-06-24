import net from "node:net";
import tls from "node:tls";

type NotificationPayload = {
  to: string;
  subject: string;
  message: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function buildEmailMessage(payload: NotificationPayload) {
  const from = process.env.SMTP_FROM ?? "CA Resilience <caresilience@gmail.com>";
  const host = (process.env.SMTP_HOST ?? "caresilience.gmail.local").replace(/[^a-z0-9.-]/gi, "") || "caresilience.gmail.local";
  const body = payload.message.replace(/\r?\n/g, "\r\n");

  return [
    `From: ${from}`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${host}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body
  ].join("\r\n");
}

function waitForResponse(socket: SmtpSocket) {
  return new Promise<{ code: number; lines: string[] }>((resolve, reject) => {
    let buffer = "";

    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      if (!lines.length) return;

      const lastLine = lines[lines.length - 1];
      if (!/^\d{3} /.test(lastLine)) return;

      cleanup();
      resolve({
        code: Number(lastLine.slice(0, 3)),
        lines
      });
    };

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function sendCommand(socket: SmtpSocket, command: string) {
  socket.write(`${command}\r\n`);
  const response = await waitForResponse(socket);

  if (response.code >= 400) {
    throw new Error(`SMTP command failed (${response.code}) for "${command}"`);
  }

  return response;
}

async function connectSmtpSocket(host: string, port: number, secure: boolean) {
  if (secure) {
    return await new Promise<tls.TLSSocket>((resolve, reject) => {
      const socket = tls.connect(
        {
          host,
          port,
          servername: host
        },
        () => resolve(socket)
      );

      socket.once("error", reject);
    });
  }

  return await new Promise<net.Socket>((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => resolve(socket));
    socket.once("error", reject);
  });
}

async function upgradeToTls(socket: net.Socket, host: string) {
  return await new Promise<tls.TLSSocket>((resolve, reject) => {
    const secureSocket = tls.connect(
      {
        socket,
        servername: host
      },
      () => resolve(secureSocket)
    );

    secureSocket.once("error", reject);
  });
}

async function authenticateIfNeeded(socket: SmtpSocket, host: string) {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) {
    return;
  }

  const encodedPlain = Buffer.from(`\0${user}\0${pass}`).toString("base64");
  try {
    await sendCommand(socket, `AUTH PLAIN ${encodedPlain}`);
    return;
  } catch {
    const loginResponse = await sendCommand(socket, "AUTH LOGIN");
    if (loginResponse.code !== 334) {
      throw new Error(`SMTP authentication failed for host ${host}.`);
    }

    const userResponse = await sendCommand(socket, Buffer.from(user).toString("base64"));
    if (userResponse.code !== 334) {
      throw new Error(`SMTP username step failed for host ${host}.`);
    }

    const passwordResponse = await sendCommand(socket, Buffer.from(pass).toString("base64"));
    if (passwordResponse.code !== 235) {
      throw new Error(`SMTP password step failed for host ${host}.`);
    }
  }
}

async function sendViaSmtp(payload: NotificationPayload) {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    return { ok: true, mode: "stub" as const, payload };
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const from = extractEmailAddress(process.env.SMTP_FROM ?? "CA Resilience <caresilience@gmail.com>");
  const to = extractEmailAddress(payload.to);
  let socket: SmtpSocket = await connectSmtpSocket(host, port, secure);
  socket.setEncoding("utf8");

  const banner = await waitForResponse(socket);
  if (banner.code !== 220) {
    throw new Error(`SMTP server at ${host}:${port} did not accept the connection.`);
  }

  const ehlo = await sendCommand(socket, "EHLO localhost");
  const supportsStartTls = ehlo.lines.some((line) => /STARTTLS/i.test(line));

  if (!secure && supportsStartTls && socket instanceof net.Socket) {
    const startTls = await sendCommand(socket, "STARTTLS");
    if (startTls.code !== 220) {
      throw new Error(`SMTP server at ${host}:${port} refused STARTTLS.`);
    }

    socket = await upgradeToTls(socket, host);
    socket.setEncoding("utf8");
    await sendCommand(socket, "EHLO localhost");
  }

  await authenticateIfNeeded(socket, host);

  const mailFrom = await sendCommand(socket, `MAIL FROM:<${from}>`);
  if (mailFrom.code !== 250) {
    throw new Error(`SMTP MAIL FROM failed for ${from}.`);
  }

  const rcptTo = await sendCommand(socket, `RCPT TO:<${to}>`);
  if (rcptTo.code !== 250 && rcptTo.code !== 251) {
    throw new Error(`SMTP RCPT TO failed for ${to}.`);
  }

  const dataResponse = await sendCommand(socket, "DATA");
  if (dataResponse.code !== 354) {
    throw new Error("SMTP DATA command was not accepted.");
  }

  const encodedMessage = buildEmailMessage(payload).replace(/^\./gm, "..");
  await new Promise<void>((resolve, reject) => {
    socket.write(`${encodedMessage}\r\n.\r\n`, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const finalResponse = await waitForResponse(socket);
  if (finalResponse.code !== 250) {
    throw new Error("SMTP server did not accept the message body.");
  }

  await sendCommand(socket, "QUIT").catch(() => null);
  socket.end();

  return { ok: true, mode: "smtp-sent" as const, payload };
}

export async function sendEmailNotification(payload: NotificationPayload) {
  return sendViaSmtp(payload);
}

export async function sendWhatsAppPlaceholder(message: string) {
  return {
    ok: true,
    message,
    note: "Connect your WhatsApp Business API credentials here."
  };
}
