import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const submissions = await prisma.submission.findMany({
    include: {
      student: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ submissions });
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
