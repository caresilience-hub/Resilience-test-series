import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePaperTimelines, parseSelectedSubjects } from "@/lib/student-state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      userId: true,
      selectedSubjects: true,
      subjectTimelines: true,
      courseFee: true,
      refundableDeposit: true,
      totalPaid: true,
      paymentStatus: true,
      refundStatus: true,
      sincerityScore: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          surname: true,
          mobile: true,
          email: true
        }
      },
      enrollments: true,
      submissions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: true,
          paperTitle: true,
          status: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({
    students: students.map((student) => ({
      ...student,
      selectedSubjects: parseSelectedSubjects(student.selectedSubjects),
      subjectTimelines: parsePaperTimelines(student.subjectTimelines)
    }))
  });
}
