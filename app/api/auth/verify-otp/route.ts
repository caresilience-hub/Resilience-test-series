import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(_: NextRequest) {
  return NextResponse.json(
    {
      message: "OTP verification has been removed. Use mobile login or new registration."
    },
    { status: 410 }
  );
}
