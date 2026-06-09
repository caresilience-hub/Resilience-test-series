import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";

export const runtime = "nodejs";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "caresilience2502";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Rdtg@3101";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@resilience.test";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ message: "Invalid admin credentials." }, { status: 401 });
  }

  const user =
    (await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        firstName: "Admin",
        surname: "User",
        role: "ADMIN"
      },
      create: {
        email: ADMIN_EMAIL,
        firstName: "Admin",
        surname: "User",
        role: "ADMIN"
      }
    })) ?? null;

  const token = buildSessionToken(user.id, "ADMIN");
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  const response = NextResponse.json({
    ok: true,
    redirectTo: "/admin/dashboard"
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
