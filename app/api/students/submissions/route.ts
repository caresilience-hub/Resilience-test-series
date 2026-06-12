import { NextRequest, NextResponse } from "next/server";
import { SubmissionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readRoleFromRequest, readSessionFromRequest } from "@/lib/authorization";
import { formatDate, normalizeSubjectName } from "@/lib/pricing";
import { savePublicUpload } from "@/lib/file-storage";

export const runtime = "nodejs";

async function getStudentId(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) return null;

  const student = await prisma.student.findUnique({
    where: { userId: session.userId },
    select: { id: true }
  });
  return student?.id ?? null;
}

async function getStudentForRequest(request: NextRequest) {
  const session = readSessionFromRequest(request);
  if (!session) return null;

  return prisma.student.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      userId: true,
      paymentStatus: true,
      enrollments: true,
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
  });
}

export async function GET(request: NextRequest) {
  if (readRoleFromRequest(request) !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const studentId = await getStudentId(request);
  if (!studentId) {
    return NextResponse.json({ submissions: [] });
  }

  const submissions = await prisma.submission.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    submissions: submissions.map((submission) => ({
      ...submission,
      subject: normalizeSubjectName(submission.subject)
    }))
  });
}

export async function POST(request: NextRequest) {
  if (readRoleFromRequest(request) !== "STUDENT") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const studentId = await getStudentId(request).catch(async () => null);
  if (!studentId) {
    return NextResponse.json({ message: "Student profile not found." }, { status: 404 });
  }

  let student: Awaited<ReturnType<typeof getStudentForRequest>> | null = null;
  try {
    student = await getStudentForRequest(request);
  } catch {
    student = null;
  }
  if (!student) {
    return NextResponse.json({ message: "Student profile not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const subject = String(formData.get("subject") ?? "").trim();
  const paperTitle = String(formData.get("paperTitle") ?? "").trim();
  const file = formData.get("file");

  if (!subject || !paperTitle || !(file instanceof File)) {
    return NextResponse.json({ message: "subject, paperTitle, and file are required." }, { status: 400 });
  }

  if (student.paymentStatus !== "APPROVED") {
    return NextResponse.json({ message: "You can upload only after admin confirms your payment." }, { status: 403 });
  }

  const enrollment = student.enrollments.find((item) => normalizeSubjectName(item.subject) === normalizeSubjectName(subject));
  if (!enrollment) {
    return NextResponse.json({ message: "No scheduled paper found for this subject." }, { status: 404 });
  }

  const now = new Date();
  if (now.getTime() < enrollment.dueDate.getTime()) {
    return NextResponse.json({
      message: `You can upload this answer sheet on or after ${formatDate(enrollment.dueDate)}.`
    }, { status: 403 });
  }

  const fileUrl = await savePublicUpload(file, ["uploads", studentId]);
  const submission = await prisma.submission.create({
    data: {
      studentId,
      subject: normalizeSubjectName(subject),
      paperTitle,
      fileUrl,
      status: SubmissionStatus.SUBMITTED
    }
  });

  return NextResponse.json({ submission, fileUrl }, { status: 201 });
}
