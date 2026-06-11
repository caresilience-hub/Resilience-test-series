import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeKind(kind?: string | null) {
  return kind?.toLowerCase().trim().replace(/\s+/g, "-") ?? "";
}

export async function GET(request: NextRequest) {
  const grants = await prisma.paperAccess.findMany({
    select: {
      id: true,
      studentId: true,
      subjectPaperId: true,
      canDownloadPaper: true,
      canDownloadAnswer: true,
      createdAt: true,
      updatedAt: true,
      student: {
        select: {
          id: true,
          userId: true,
          user: {
            select: {
              id: true,
              firstName: true,
              surname: true,
              mobile: true,
              email: true
            }
          }
        }
      },
      subjectPaper: {
        select: {
          id: true,
          title: true,
          subject: true,
          kind: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ grants });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const studentId = String(body.studentId ?? "");
  const subjectPaperId = String(body.subjectPaperId ?? "");
  const canDownloadPaper = Boolean(body.canDownloadPaper);
  const canDownloadAnswer = Boolean(body.canDownloadAnswer);

  if (!studentId || !subjectPaperId) {
    return NextResponse.json({ message: "studentId and subjectPaperId are required." }, { status: 400 });
  }

  const subjectPaper = await prisma.subjectPaper.findUnique({
    where: { id: subjectPaperId }
  });

  if (!subjectPaper) {
    return NextResponse.json({ message: "Selected paper was not found." }, { status: 404 });
  }

  const paperKind = normalizeKind(subjectPaper.kind);
  const finalCanDownloadPaper = paperKind === "answer-sheet" ? false : canDownloadPaper;
  const finalCanDownloadAnswer = canDownloadAnswer;

  if (!finalCanDownloadPaper && !finalCanDownloadAnswer) {
    return NextResponse.json({ message: "Select at least one access option to save." }, { status: 400 });
  }

  const grant = await prisma.paperAccess.upsert({
    where: {
      studentId_subjectPaperId: {
        studentId,
        subjectPaperId
      }
    },
    update: {
      canDownloadPaper: finalCanDownloadPaper,
      canDownloadAnswer: finalCanDownloadAnswer
    },
    create: {
      studentId,
      subjectPaperId,
      canDownloadPaper: finalCanDownloadPaper,
      canDownloadAnswer: finalCanDownloadAnswer
    }
  });

  return NextResponse.json({ grant }, { status: 201 });
}
