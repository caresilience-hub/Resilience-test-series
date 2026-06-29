import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDate, parseDisplayDate } from "@/lib/pricing";
import { parsePaperTimelines, serializePaperTimelines } from "@/lib/student-state";

export const runtime = "nodejs";

function calculateTimelineDays(dueDate: Date) {
  return Math.max(0, Math.ceil((dueDate.getTime() - Date.now()) / 86400000));
}

export async function PATCH(request: NextRequest, context: any) {
  const { studentId, enrollmentId } = context.params as { studentId: string; enrollmentId: string };

  const body = await request.json().catch(() => null);
  const dueDateInput = typeof body?.dueDate === "string" ? body.dueDate.trim() : "";
  const dueDate = parseDisplayDate(dueDateInput);

  if (!dueDate) {
    return NextResponse.json({ message: "Please provide a valid paper date." }, { status: 400 });
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, studentId },
    select: {
      id: true,
      subject: true,
      dueDate: true,
      student: {
        select: {
          id: true,
          subjectTimelines: true
        }
      }
    }
  });

  if (!enrollment) {
    return NextResponse.json({ message: "Paper schedule not found." }, { status: 404 });
  }

  const updatedEnrollment = await prisma.$transaction(async (tx) => {
    const savedEnrollment = await tx.enrollment.update({
      where: { id: enrollment.id },
      data: {
        dueDate,
        timelineDays: calculateTimelineDays(dueDate)
      }
    });

    const currentTimelines = parsePaperTimelines(enrollment.student.subjectTimelines);
    currentTimelines[enrollment.subject] = formatDate(dueDate);

    await tx.student.update({
      where: { id: enrollment.student.id },
      data: {
        subjectTimelines: serializePaperTimelines(currentTimelines)
      }
    });

    return savedEnrollment;
  });

  return NextResponse.json({
    enrollment: {
      id: updatedEnrollment.id,
      subject: updatedEnrollment.subject,
      dueDate: updatedEnrollment.dueDate.toISOString(),
      dueDateLabel: formatDate(updatedEnrollment.dueDate),
      timelineDays: updatedEnrollment.timelineDays
    }
  });
}
