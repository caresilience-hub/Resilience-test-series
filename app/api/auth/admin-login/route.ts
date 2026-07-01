import { NextRequest, NextResponse } from "next/server";
import { buildSessionToken } from "@/lib/session";
import { shouldUseSecureCookies } from "@/lib/cookies";
import { ADMIN_USERNAME, ADMIN_PASSWORD } from "@/lib/admin-credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let username = "";
  let password = "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    username = String(body.username ?? "").trim();
    password = String(body.password ?? "");
  } else {
    const bodyText = await request.text().catch(() => "");
    const formData = new URLSearchParams(bodyText);
    username = String(formData.get("username") ?? "").trim();
    password = String(formData.get("password") ?? "");
  }

  if (!username || !password) {
    const response = NextResponse.redirect(new URL("/admin/login?error=missing", request.url));
    response.cookies.set("resillience_session", "", { path: "/", maxAge: 0 });
    return response;
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    const response = NextResponse.redirect(new URL("/admin/login?error=invalid", request.url));
    response.cookies.set("resillience_session", "", { path: "/", maxAge: 0 });
    return response;
  }

  const token = buildSessionToken("admin", "ADMIN");

  const response = NextResponse.redirect(new URL("/admin/dashboard", request.url),303);

  response.cookies.set("resillience_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return response;
}
