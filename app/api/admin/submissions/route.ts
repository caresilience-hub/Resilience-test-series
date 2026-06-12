import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeSubjectName } from "@/lib/pricing";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const submissions = await prisma.submission.findMany({
    select: {
      id: true,
      studentId: true,
      subject: true,
      paperTitle: true,
      fileUrl: true,
      checkedAnswerUrl: true,
      status: true,
      marksAwarded: true,
      sincereAttempt: true,
      evaluatorNote: true,
      checkedAt: true,
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
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    submissions: submissions.map((submission) => ({
      ...submission,
      subject: normalizeSubjectName(submission.subject)
    }))
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const submission = await prisma.submission.update({
    where: { id: String(body.id) },
    data: {
      marksAwarded: body.marksAwarded !== undefined ? Number(body.marksAwarded) : undefined,
      sincereAttempt: body.sincereAttempt !== undefined ? Boolean(body.sincereAttempt) : undefined,
      evaluatorNote: body.evaluatorNote !== undefined ? String(body.evaluatorNote) : undefined,
      status: body.status ? (String(body.status) as any) : undefined
    }
  });

  return NextResponse.json({ submission });
}
