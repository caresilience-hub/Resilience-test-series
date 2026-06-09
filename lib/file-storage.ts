import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isProductionDeployment() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

async function loadBlobSdk() {
  try {
    return await import("@vercel/blob");
  } catch {
    return null;
  }
}

export async function savePublicUpload(file: File, segments: string[]) {
  const safeName = sanitizeFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;
  const relativePath = posix.join(...segments, fileName);

  const blobSdk = await loadBlobSdk();
  if (process.env.BLOB_READ_WRITE_TOKEN && blobSdk?.put) {
    const blob = await blobSdk.put(relativePath, file, {
      access: "public",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return blob.url;
  }

  if (isProductionDeployment()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add it to your Vercel environment variables.");
  }

  const absolutePath = join(process.cwd(), "public", "storage", ...segments, fileName);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return `/storage/${relativePath}`;
}

export async function deletePublicUpload(fileUrl: string) {
  if (!fileUrl) return;

  const blobSdk = await loadBlobSdk();
  if (fileUrl.startsWith("http") && process.env.BLOB_READ_WRITE_TOKEN && blobSdk?.del) {
    await blobSdk.del(fileUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return;
  }

  const localPath = join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  await unlink(localPath).catch(() => undefined);
}
