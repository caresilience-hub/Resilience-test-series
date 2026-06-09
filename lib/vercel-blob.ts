type UploadOptions = {
  access: "public" | "private";
  token?: string;
};

type UploadResult = {
  url: string;
  downloadUrl?: string;
  pathname?: string;
};

function getBlobApiUrl() {
  return (process.env.VERCEL_BLOB_API_URL ?? "https://vercel.com/api/blob").replace(/\/+$/, "");
}

function getAuthToken(explicitToken?: string) {
  const token = explicitToken ?? process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }
  return token;
}

async function readErrorMessage(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return `Blob request failed with status ${response.status}.`;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? text;
  } catch {
    return text;
  }
}

export async function uploadBlob(pathname: string, file: File, options: UploadOptions): Promise<UploadResult> {
  const token = getAuthToken(options.token);
  const apiUrl = new URL(getBlobApiUrl());
  apiUrl.searchParams.set("pathname", pathname);
  apiUrl.searchParams.set("access", options.access);

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": file.type || "application/octet-stream"
    },
    body: Buffer.from(await file.arrayBuffer())
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as UploadResult;
}

export async function deleteBlob(url: string, options?: { token?: string }) {
  const token = getAuthToken(options?.token);
  const response = await fetch(`${getBlobApiUrl()}/delete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ urls: [url] })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}
