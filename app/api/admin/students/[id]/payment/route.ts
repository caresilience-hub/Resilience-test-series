import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: any) {
  const body = await request.json();
  const paymentStatus = String(body.paymentStatus ?? "").trim();
  const params = context.params as { id: string };

  if (!["APPROVED", "REJECTED", "WAITING_CONFIRMATION"].includes(paymentStatus)) {
    return NextResponse.json({ message: "Invalid payment status." }, { status: 400 });
  }

  const student = await prisma.student.update({
    where: { id: params.id },
    data: {
      paymentStatus: paymentStatus as "APPROVED" | "REJECTED" | "WAITING_CONFIRMATION"
    }
  });

  return NextResponse.json({ student });
}
