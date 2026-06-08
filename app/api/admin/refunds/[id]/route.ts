import { NextRequest, NextResponse } from "next/server";
import { RefundStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: any) {
  const body = await request.json();
  const params = context.params as { id: string };
  const student = await prisma.student.update({
    where: { id: params.id },
    data: {
      refundStatus: (String(body.refundStatus ?? RefundStatus.UNDER_REVIEW) as RefundStatus) ?? RefundStatus.UNDER_REVIEW,
      sincerityScore: body.sincerityScore !== undefined ? Number(body.sincerityScore) : undefined
    }
  });

  return NextResponse.json({ student });
}
