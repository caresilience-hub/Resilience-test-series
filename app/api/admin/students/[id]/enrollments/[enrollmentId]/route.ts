import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate, parseDisplayDate } from "@/lib/pricing";
import { parsePaperTimelines, serializePaperTimelines } from "@/lib/student-state";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: any) {
  const params = context.params as { id: string; enrollmentId: string };
  const body = await request.json().catch(() => ({}));
  const dueDateValue = String(body.dueDate ?? "").trim();

  if (!dueDateValue) {
    return NextResponse.json({ message: "Please choose a new paper date." }, { status: 400 });
  }

  const dueDate = parseDisplayDate(dueDateValue);
  if (!dueDate) {
    return NextResponse.json({ message: "Please provide a valid date." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      subjectTimelines: true
    }
  });

  if (!student) {
    return NextResponse.json({ message: "Student not found." }, { status: 404 });
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: params.enrollmentId,
      studentId: student.id
    },
    select: {
      id: true,
      subject: true
    }
  });

  if (!enrollment) {
    return NextResponse.json({ message: "Paper schedule not found for this student." }, { status: 404 });
  }

  const timelineDays = Math.max(1, Math.ceil((dueDate.getTime() - Date.now()) / 86400000) || 1);
  const subjectTimelines = parsePaperTimelines(student.subjectTimelines);
  subjectTimelines[enrollment.subject] = formatDate(dueDate);

  const [updatedEnrollment] = await prisma.$transaction([
    prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        dueDate,
        timelineDays
      }
    }),
    prisma.student.update({
      where: { id: student.id },
      data: {
        subjectTimelines: serializePaperTimelines(subjectTimelines)
      }
    })
  ]);

  return NextResponse.json({
    updated: true,
    enrollment: {
      id: updatedEnrollment.id,
      subject: updatedEnrollment.subject,
      dueDate: updatedEnrollment.dueDate.toISOString(),
      dueDateLabel: formatDate(updatedEnrollment.dueDate),
      timelineDays: updatedEnrollment.timelineDays
    }
  });
}
