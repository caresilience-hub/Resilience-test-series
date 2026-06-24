import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";
import { parseDisplayDate } from "@/lib/pricing";
import { serializePaperTimelines, serializeSelectedSubjects } from "@/lib/student-state";
import { upsertStudentIdentity } from "@/lib/student-user";
import { parsePaperSelections } from "@/lib/paper-selections";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const orderId = String(body.razorpay_order_id ?? "");
  const paymentId = String(body.razorpay_payment_id ?? "");
  const signature = String(body.razorpay_signature ?? "");
  const firstName = String(body.firstName ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const mobile = String(body.mobile ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const selection = parsePaperSelections(body);
  const pricing = body.pricing ?? {};
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? process.env.RAZORPAY_KEY_SECRET ?? "";

  if (!orderId || !paymentId) {
    return NextResponse.json({ message: "Missing payment identifiers." }, { status: 400 });
  }

  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  if (signature !== expected) {
    return NextResponse.json({ message: "Invalid payment signature." }, { status: 401 });
  }

  const missingUnitTest = selection.unitTests.find((item) => item.subject && !item.paper);
  if (missingUnitTest) {
    return NextResponse.json({ message: `Please select a paper for ${missingUnitTest.subject}.` }, { status: 400 });
  }

  const invalidDate = selection.fullLength.find((item) => !parseDisplayDate(String(item.date ?? "")));
  if (invalidDate) {
    return NextResponse.json({ message: `Please enter ${invalidDate.subject} in dd/mm/yyyy format.` }, { status: 400 });
  }

  return saveEnrollmentAndSession({
    firstName,
    surname,
    mobile,
    email,
    selectedSubjects,
    paperDates,
    pricing,
    secureCookie: shouldUseSecureCookies(request)
  });
}

async function saveEnrollmentAndSession({
  firstName,
  surname,
  mobile,
  email,
  selectedSubjects,
  paperDates,
  pricing,
  secureCookie
}: {
  firstName: string;
  surname: string;
  mobile: string;
  email: string;
  selectedSubjects: string[];
  paperDates: Record<string, string>;
  pricing: {
    courseFee?: number;
    refundableDeposit?: number;
    totalPayable?: number;
  };
  secureCookie: boolean;
}) {
  if (!email) {
    return NextResponse.json({ message: "Student email is required." }, { status: 400 });
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
        selectedSubjects: serializeSelectedSubjects(selection.selectedSubjects),
        subjectTimelines: serializePaperTimelines(selection.paperDates),
        courseFee: Number(pricing.courseFee ?? 0),
        refundableDeposit: Number(pricing.refundableDeposit ?? 0),
        totalPaid: Number(pricing.totalPayable ?? 0)
      },
      create: {
        userId: user.id,
        selectedSubjects: serializeSelectedSubjects(selection.selectedSubjects),
        subjectTimelines: serializePaperTimelines(selection.paperDates),
        courseFee: Number(pricing.courseFee ?? 0),
        refundableDeposit: Number(pricing.refundableDeposit ?? 0),
        totalPaid: Number(pricing.totalPayable ?? 0)
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
          timelineDays: 1,
          startDate: new Date(),
          dueDate: new Date()
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

  const response = NextResponse.json({ ok: true, redirectTo: "/student/dashboard" });
  response.cookies.set("resillience_session", result.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return response;
}
