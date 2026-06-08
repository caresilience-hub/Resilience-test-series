import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePaperTimelines, parseSelectedSubjects } from "@/lib/student-state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const students = await prisma.student.findMany({
    include: {
      user: true,
      enrollments: true,
      submissions: {
        orderBy: { createdAt: "desc" }
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
