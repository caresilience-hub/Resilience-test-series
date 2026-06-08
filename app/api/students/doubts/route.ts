import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readRoleFromRequest } from "@/lib/authorization";

export const runtime = "nodejs";

async function findCurrentStudentId(request: NextRequest) {
  const token = request.cookies.get("resillience_session")?.value ?? "";
  const session = await prisma.session.findUnique({ where: { token }, select: { userId: true } });
  const student = session
    ? await prisma.student.findUnique({
        where: { userId: session.userId },
        select: { id: true }
      })
    : null;
  return student?.id ?? null;
}

export async function GET(request: NextRequest) {
  if (readRoleFromRequest(request) !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const studentId = await findCurrentStudentId(request);
  if (!studentId) {
    return NextResponse.json({ doubts: [] });
  }

  const doubts = await prisma.doubtRequest.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ doubts });
}

export async function POST(request: NextRequest) {
  if (readRoleFromRequest(request) !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const studentId = await findCurrentStudentId(request);
  const body = await request.json();
  const message = String(body.message ?? "").trim();

  if (!studentId) {
    return NextResponse.json({ message: "Student profile not found." }, { status: 404 });
  }

  if (!message) {
    return NextResponse.json({ message: "message is required." }, { status: 400 });
  }

  const doubt = await prisma.doubtRequest.create({
    data: {
      studentId,
      message,
      channel: String(body.channel ?? "in-app")
    }
  });

  return NextResponse.json({ doubt }, { status: 201 });
}

