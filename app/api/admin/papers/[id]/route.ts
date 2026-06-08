import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deletePublicUpload } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest, context: any) {
  const params = context.params as { id: string };

  const existing = await prisma.subjectPaper.findUnique({
    where: { id: params.id }
  });

  if (existing?.fileUrl) {
    await deletePublicUpload(existing.fileUrl);
  }

  if (existing?.sampleAnswerUrl && existing.sampleAnswerUrl !== existing.fileUrl) {
    await deletePublicUpload(existing.sampleAnswerUrl);
  }

  const paper = await prisma.subjectPaper.delete({
    where: { id: params.id }
  });

  return NextResponse.json({ paper });
}
