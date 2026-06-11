import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: any) {
  const { id } = context.params as { id: string };
  const body = await request.json().catch(() => ({}));
  const providedPassword = String(body.password ?? "").trim();
  const temporaryPassword = providedPassword || generateTemporaryPassword();

  if (temporaryPassword.length < 8) {
    return NextResponse.json({ message: "Please provide a password with at least 8 characters." }, { status: 400 });
  }

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          firstName: true,
          surname: true,
          email: true
        }
      }
    }
  });

  if (!student) {
    return NextResponse.json({ message: "Student not found." }, { status: 404 });
  }

  const passwordHash = await hashPassword(temporaryPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: student.userId },
      data: {
        passwordHash
      }
    }),
    prisma.session.deleteMany({
      where: { userId: student.userId }
    })
  ]);

  return NextResponse.json({
    updated: true,
    studentId: student.id,
    temporaryPassword,
    student: {
      id: student.id,
      name: [student.user.firstName, student.user.surname].filter(Boolean).join(" ") || "Student",
      email: student.user.email
    }
  });
}
