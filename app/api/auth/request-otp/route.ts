import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomInt, createHash } from "crypto";

export const runtime = "nodejs";

function hashOtp(otp: string) {
  return createHash("sha256").update(`${otp}:${process.env.APP_SECRET ?? "dev-secret"}`).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identity = String(body.identity ?? "").trim().toLowerCase();
  const role = body.role === "ADMIN" ? "ADMIN" : "STUDENT";

  if (!identity) {
    return NextResponse.json({ message: "Identity is required." }, { status: 400 });
  }

  const otp = process.env.NODE_ENV === "production" ? String(randomInt(100000, 999999)) : "123456";
  const user =
    (await prisma.user.upsert({
      where: { email: identity.includes("@") ? identity : `${identity}@resillience.local` },
      update: identity.includes("@")
        ? {}
        : {
            mobile: identity
          },
      create: {
        email: identity.includes("@") ? identity : `${identity}@resillience.local`,
        mobile: identity.includes("@") ? null : identity,
        role
      }
    })) ?? null;

  if (user) {
    await prisma.otpCode.create({
      data: {
        userId: user.id,
        codeHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
  }

  return NextResponse.json({
    message: "OTP generated successfully.",
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp
  });
}
