type NotificationPayload = {
  to: string;
  subject: string;
  message: string;
};

export async function sendEmailNotification(payload: NotificationPayload) {
  if (!process.env.SMTP_HOST) {
    return { ok: true, mode: "stub" as const, payload };
  }

  return { ok: true, mode: "smtp-ready" as const, payload };
}

export async function sendWhatsAppPlaceholder(message: string) {
  return {
    ok: true,
    message,
    note: "Connect your WhatsApp Business API credentials here."
  };
}

