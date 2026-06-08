import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";

export const runtime = "nodejs";

function hashOtp(otp: string) {
  return createHash("sha256").update(`${otp}:${process.env.APP_SECRET ?? "dev-secret"}`).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const identity = String(body.identity ?? "").trim().toLowerCase();
  const otp = String(body.otp ?? "").trim();
  const role = body.role === "ADMIN" ? "ADMIN" : "STUDENT";
  const email = identity.includes("@") ? identity : `${identity}@resillience.local`;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== role) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const latestOtp = await prisma.otpCode.findFirst({
    where: {
      userId: user.id,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!latestOtp || latestOtp.codeHash !== hashOtp(otp) || (process.env.NODE_ENV === "production" && otp.length < 6)) {
    return NextResponse.json({ message: "Invalid or expired OTP." }, { status: 401 });
  }

  const token = buildSessionToken(user.id, role);
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set("resillience_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return response;
}
