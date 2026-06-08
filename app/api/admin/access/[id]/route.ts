import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeKind(kind?: string | null) {
  return kind?.toLowerCase().trim().replace(/\s+/g, "-") ?? "";
}

export async function PATCH(request: NextRequest, context: any) {
  const { id } = context.params as { id: string };
  const body = await request.json();

  const grant = await prisma.paperAccess.findUnique({
    where: { id },
    include: {
      subjectPaper: true
    }
  });

  if (!grant) {
    return NextResponse.json({ message: "Access grant not found." }, { status: 404 });
  }

  const paperKind = normalizeKind(grant.subjectPaper.kind);
  const nextCanDownloadPaper =
    body.canDownloadPaper !== undefined ? Boolean(body.canDownloadPaper) : grant.canDownloadPaper;
  const nextCanDownloadAnswer =
    body.canDownloadAnswer !== undefined ? Boolean(body.canDownloadAnswer) : grant.canDownloadAnswer;

  const normalizedCanDownloadPaper = paperKind === "answer-sheet" ? false : nextCanDownloadPaper;
  const normalizedCanDownloadAnswer = nextCanDownloadAnswer;

  if (!normalizedCanDownloadPaper && !normalizedCanDownloadAnswer) {
    await prisma.paperAccess.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  const updatedGrant = await prisma.paperAccess.update({
    where: { id },
    data: {
      canDownloadPaper: normalizedCanDownloadPaper,
      canDownloadAnswer: normalizedCanDownloadAnswer
    }
  });

  return NextResponse.json({ grant: updatedGrant });
}

export async function DELETE(_: NextRequest, context: any) {
  const { id } = context.params as { id: string };

  const grant = await prisma.paperAccess.findUnique({
    where: { id }
  });

  if (!grant) {
    return NextResponse.json({ message: "Access grant not found." }, { status: 404 });
  }

  await prisma.paperAccess.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
