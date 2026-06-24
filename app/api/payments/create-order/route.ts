import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseDisplayDate } from "@/lib/pricing";
import { serializePaperTimelines, serializeSelectedSubjects } from "@/lib/student-state";
import { upsertStudentIdentity } from "@/lib/student-user";
import { parsePaperSelections } from "@/lib/paper-selections";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const totalPayable = Number(body.totalPayable ?? body.pricing?.totalPayable ?? 0);
  const firstName = String(body.firstName ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const mobile = String(body.mobile ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const selection = parsePaperSelections(body);

  if (!totalPayable || totalPayable < 1) {
    return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
  }

  const missingUnitTest = selection.unitTests.find((item) => item.subject && !item.paper);
  if (missingUnitTest) {
    return NextResponse.json({ error: `Please select a paper for ${missingUnitTest.subject}.` }, { status: 400 });
  }

  if (selection.selectedSubjects.length < 1) {
    return NextResponse.json({ error: "Please select at least one paper." }, { status: 400 });
  }

  const missingDate = selection.fullLength.find((item) => !String(item.date ?? "").trim());
  if (missingDate) {
    return NextResponse.json({ error: `Please enter a paper date for ${missingDate.subject}.` }, { status: 400 });
  }

  const invalidDate = selection.fullLength.find((item) => !parseDisplayDate(String(item.date ?? "")));
  if (invalidDate) {
    return NextResponse.json({ error: `Please enter ${invalidDate.subject} in dd/mm/yyyy format.` }, { status: 400 });
  }

  if (email) {
    await prisma.$transaction(async (transaction) => {
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
          courseFee: Number(body.pricing?.courseFee ?? 0),
          refundableDeposit: Number(body.pricing?.refundableDeposit ?? 0),
          totalPaid: 0
        },
        create: {
          userId: user.id,
          selectedSubjects: serializeSelectedSubjects(selection.selectedSubjects),
          subjectTimelines: serializePaperTimelines(selection.paperDates),
          courseFee: Number(body.pricing?.courseFee ?? 0),
          refundableDeposit: Number(body.pricing?.refundableDeposit ?? 0),
          totalPaid: 0
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
    });
  }

  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: totalPayable * 100,
      currency: "INR",
        receipt: `receipt_${Date.now()}`,
        notes: {
          studentEmail: body.email,
          studentName: `${body.firstName ?? ""} ${body.surname ?? ""}`.trim(),
          selectedPapers: String(selection.selectedSubjects.length)
        }
      })
  });

  const order = await response.json();

  if (!response.ok) {
    return NextResponse.json({ error: order?.error?.description ?? "Unable to create Razorpay order." }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    keyId
  });
}
