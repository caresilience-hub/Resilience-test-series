import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";
import { serializePaperTimelines, serializeSelectedSubjects } from "@/lib/student-state";
import { parseDisplayDate } from "@/lib/pricing";
import { parsePaperSelections } from "@/lib/paper-selections";
import { upsertStudentIdentity } from "@/lib/student-user";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const mobile = String(body.mobile ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const selection = parsePaperSelections(body);
  const pricing = body.pricing ?? {};

  if (!/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ message: "Please enter a 10-digit contact number." }, { status: 400 });
  }

  if (!email.includes("@")) {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  if (password.trim().length < 8) {
    return NextResponse.json({ message: "Please create a password with at least 8 characters." }, { status: 400 });
  }

  if (!firstName || !surname || !mobile || !email) {
    return NextResponse.json({ message: "Please complete student details before submitting." }, { status: 400 });
  }

  const missingUnitTest = selection.unitTests.find((item) => item.subject && !item.paper);
  if (missingUnitTest) {
    return NextResponse.json({ message: `Please select a paper for ${missingUnitTest.subject}.` }, { status: 400 });
  }

  const missingUnitTestDate = selection.unitTests.find((item) => item.subject && item.paper && !String(item.date ?? "").trim());
  if (missingUnitTestDate) {
    return NextResponse.json({ message: `Please choose a date for ${missingUnitTestDate.subject} - ${missingUnitTestDate.label}.` }, { status: 400 });
  }

  if (selection.selectedSubjects.length < 1) {
    return NextResponse.json({ message: "Please select at least one paper." }, { status: 400 });
  }

  const missingDate = selection.fullLength.find((item) => !String(item.date ?? "").trim());
  if (missingDate) {
    return NextResponse.json({ message: `Please enter a paper date for ${missingDate.subject}.` }, { status: 400 });
  }

  const invalidDate = selection.fullLength.find((item) => !parseDisplayDate(String(item.date ?? "")));
  if (invalidDate) {
    return NextResponse.json({ message: `Please enter ${invalidDate.subject} in dd/mm/yyyy format.` }, { status: 400 });
  }

  const invalidUnitTestDate = selection.unitTests.find((item) => item.subject && item.paper && !parseDisplayDate(String(item.date ?? "")));
  if (invalidUnitTestDate) {
    return NextResponse.json({ message: `Please enter ${invalidUnitTestDate.subject} in dd/mm/yyyy format.` }, { status: 400 });
  }

  const result = await prisma.$transaction(async (transaction) => {
    const passwordHash = await hashPassword(password);
    const user = await upsertStudentIdentity(transaction, {
      firstName,
      surname,
      mobile,
      email,
      passwordHash
    });

    const student = await transaction.student.upsert({
      where: { userId: user.id },
      update: {
        selectedSubjects: serializeSelectedSubjects(selection.selectedSubjects),
        subjectTimelines: serializePaperTimelines(selection.paperDates),
        courseFee: Number(pricing.courseFee ?? 0),
        refundableDeposit: Number(pricing.refundableDeposit ?? 0),
        totalPaid: Number(pricing.totalPayable ?? 0),
        paymentStatus: "WAITING_CONFIRMATION"
      },
      create: {
        userId: user.id,
        selectedSubjects: serializeSelectedSubjects(selection.selectedSubjects),
        subjectTimelines: serializePaperTimelines(selection.paperDates),
        courseFee: Number(pricing.courseFee ?? 0),
        refundableDeposit: Number(pricing.refundableDeposit ?? 0),
        totalPaid: Number(pricing.totalPayable ?? 0),
        paymentStatus: "WAITING_CONFIRMATION"
      }
    });

    await transaction.enrollment.deleteMany({
      where: { studentId: student.id }
    });

    await transaction.enrollment.createMany({
      data: [
        ...selection.fullLength.map((item) => {
          const dueDate = parseDisplayDate(item.date) as Date;
          return {
            studentId: student.id,
            subject: item.subject,
            timelineDays: Math.max(10, Math.min(30, Math.ceil((dueDate.getTime() - Date.now()) / 86400000) || 10)),
            startDate: new Date(),
            dueDate
          };
        }),
        ...selection.unitTests.map((item) => ({
          studentId: student.id,
          subject: item.label,
          timelineDays: Math.max(1, Math.ceil((parseDisplayDate(item.date)?.getTime() ?? Date.now()) - Date.now()) / 86400000 || 1),
          startDate: new Date(),
          dueDate: parseDisplayDate(item.date) as Date
        }))
      ]
    });

    const token = buildSessionToken(user.id, "STUDENT");
    await transaction.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return { token };
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/student/dashboard",
    paymentStatus: "WAITING_CONFIRMATION"
  });

  response.cookies.set("resillience_session", result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return response;
}
