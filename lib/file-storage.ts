import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { deleteBlob, uploadBlob } from "@/lib/vercel-blob";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function savePublicUpload(file: File, segments: string[]) {
  const safeName = sanitizeFileName(file.name);
  const fileName = `${Date.now()}-${safeName}`;
  const relativePath = posix.join(...segments, fileName);

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await uploadBlob(relativePath, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return blob.url;
  }

  const absolutePath = join(process.cwd(), "public", "storage", ...segments, fileName);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return `/storage/${relativePath}`;
}

export async function deletePublicUpload(fileUrl: string) {
  if (!fileUrl) return;

  if (fileUrl.startsWith("http")) {
    await deleteBlob(fileUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return;
  }

  const localPath = join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
  await unlink(localPath).catch(() => undefined);
}
