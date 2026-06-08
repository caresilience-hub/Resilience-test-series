import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";
import { serializePaperTimelines, serializeSelectedSubjects } from "@/lib/student-state";
import { parseDisplayDate } from "@/lib/pricing";
import { upsertStudentIdentity } from "@/lib/student-user";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const firstName = String(body.firstName ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const mobile = String(body.mobile ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const selectedSubjects = Array.isArray(body.selectedSubjects) ? body.selectedSubjects.map((value: string) => String(value).trim()).filter(Boolean) : [];
  const paperDates = body.paperDates && typeof body.paperDates === "object" ? body.paperDates : {};
  const pricing = body.pricing ?? {};

  if (!firstName || !surname || !mobile || !email) {
    return NextResponse.json({ message: "Please complete student details before submitting." }, { status: 400 });
  }

  if (selectedSubjects.length < 1) {
    return NextResponse.json({ message: "Please select at least one paper." }, { status: 400 });
  }

  const missingDate = selectedSubjects.find((subject: string) => !String(paperDates[subject] ?? "").trim());
  if (missingDate) {
    return NextResponse.json({ message: `Please enter a paper date for ${missingDate}.` }, { status: 400 });
  }

  const invalidDate = selectedSubjects.find((subject: string) => !parseDisplayDate(String(paperDates[subject] ?? "")));
  if (invalidDate) {
    return NextResponse.json({ message: `Please enter ${invalidDate} in dd/mm/yyyy format.` }, { status: 400 });
  }

  const result = await prisma.$transaction(async (transaction) => {
    const user = await upsertStudentIdentity(transaction, {
      firstName,
      surname,
      mobile,
      email
    });

    const student = await transaction.student.upsert({
      where: { userId: user.id },
      update: {
        selectedSubjects: serializeSelectedSubjects(selectedSubjects),
        subjectTimelines: serializePaperTimelines(paperDates as Record<string, string>),
        courseFee: Number(pricing.courseFee ?? 0),
        refundableDeposit: Number(pricing.refundableDeposit ?? 0),
        totalPaid: Number(pricing.totalPayable ?? 0),
        paymentStatus: "WAITING_CONFIRMATION"
      },
      create: {
        userId: user.id,
        selectedSubjects: serializeSelectedSubjects(selectedSubjects),
        subjectTimelines: serializePaperTimelines(paperDates as Record<string, string>),
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
      data: selectedSubjects.map((subject: string) => {
        const dueDate = parseDisplayDate(String(paperDates[subject] ?? "")) as Date;
        return {
          studentId: student.id,
          subject,
          timelineDays: Math.max(10, Math.min(30, Math.ceil((dueDate.getTime() - Date.now()) / 86400000) || 10)),
          startDate: new Date(),
          dueDate
        };
      })
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
