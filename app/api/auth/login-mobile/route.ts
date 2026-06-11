import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const mobile = String(body.mobile ?? "").trim();
  const password = String(body.password ?? "");

  if (!/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ message: "Please enter a 10-digit mobile number." }, { status: 400 });
  }

  if (password.trim().length < 8) {
    return NextResponse.json({ message: "Please enter your password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { mobile }
  });

  if (!user || user.role !== "STUDENT") {
    return NextResponse.json(
      {
        message: "No student account found for this mobile number. Please register first.",
        notFound: true
      },
      { status: 404 }
    );
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      {
        message: "This student account needs a password reset. Please use the Forgot password option or ask the admin to reset it.",
        notFound: true
      },
      { status: 409 }
    );
  }

  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    return NextResponse.json(
      {
        message: "The password you entered is incorrect."
      },
      { status: 401 }
    );
  }

  const token = buildSessionToken(user.id, "STUDENT");
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/student/dashboard"
  });

  response.cookies.set("resillience_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return response;
}
