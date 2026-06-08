import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRoleFromRequest, readSessionFromRequest } from "@/lib/authorization";

export const runtime = "nodejs";

function normalizeKind(kind?: string | null) {
  return kind?.toLowerCase().trim().replace(/\s+/g, "-") ?? "";
}

export async function GET(request: NextRequest) {
  if (readRoleFromRequest(request) !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const session = readSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ papers: [] });
  }

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    include: {
      paperAccesses: {
        include: {
          subjectPaper: true
        }
      }
    }
  });

  const papers = (student?.paperAccesses ?? []).map((grant) => ({
    id: grant.subjectPaper.id,
    subject: grant.subjectPaper.subject,
    title: grant.subjectPaper.title,
    kind: normalizeKind(grant.subjectPaper.kind) || grant.subjectPaper.kind,
    fileUrl: grant.canDownloadPaper && normalizeKind(grant.subjectPaper.kind) !== "answer-sheet" ? grant.subjectPaper.fileUrl : null,
    sampleAnswerUrl:
      grant.canDownloadAnswer
        ? grant.subjectPaper.sampleAnswerUrl ?? (normalizeKind(grant.subjectPaper.kind) === "answer-sheet" ? grant.subjectPaper.fileUrl : null)
        : null,
    canDownloadPaper: grant.canDownloadPaper && normalizeKind(grant.subjectPaper.kind) !== "answer-sheet",
    canDownloadAnswer: grant.canDownloadAnswer
  }));

  return NextResponse.json({ papers });
}
