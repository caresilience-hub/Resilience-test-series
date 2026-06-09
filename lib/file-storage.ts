import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isProductionDeployment() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

function getBlobApiUrl() {
  return (process.env.VERCEL_BLOB_API_URL ?? "https://vercel.com/api/blob").replace(/\/+$/, "");
}

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add it to your Vercel environment variables.");
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

async function uploadToBlob(pathname: string, file: File) {
  const apiUrl = new URL(getBlobApiUrl());
  apiUrl.searchParams.set("pathname", pathname);
  apiUrl.searchParams.set("access", "public");

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${getBlobToken()}`,
      "content-type": file.type || "application/octet-stream"
    },
    body: Buffer.from(await file.arrayBuffer())
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json().catch(() => ({}))) as { url?: string };
  if (!data.url) {
    throw new Error("Blob upload succeeded but no URL was returned.");
  }

  return data.url;
}

async function deleteFromBlob(fileUrl: string) {
  const response = await fetch(`${getBlobApiUrl()}/delete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${getBlobToken()}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ urls: [fileUrl] })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function savePublicUpload(file: File, segments: string[]) {
  const safeName = sanitizeFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;
  const relativePath = posix.join(...segments, fileName);

  if (isProductionDeployment()) {
    return uploadToBlob(relativePath, file);
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      return await uploadToBlob(relativePath, file);
    } catch {
      // Fall through to the local filesystem in development only.
    }
  }

  const absolutePath = join(process.cwd(), "public", "storage", ...segments, fileName);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return `/storage/${relativePath}`;
}

export async function deletePublicUpload(fileUrl: string) {
  if (!fileUrl) return;

  if (fileUrl.startsWith("http")) {
    if (isProductionDeployment()) {
      await deleteFromBlob(fileUrl);
      return;
    }

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await deleteFromBlob(fileUrl);
        return;
      } catch {
        // Fall through to local delete in development only.
      }
    }

    return;
  }

  const localPath = join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  await unlink(localPath).catch(() => undefined);
}
