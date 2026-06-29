import { NextRequest, NextResponse } from "next/server";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/admin-credentials";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ message: "Invalid admin credentials." }, { status: 401 });
  }

  const token = buildSessionToken("admin", "ADMIN");

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
