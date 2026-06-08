import { NextRequest, NextResponse } from "next/server";
import { decodeSessionToken } from "@/lib/session-token";

function readRole(session: string | undefined) {
  return decodeSessionToken(session)?.role ?? null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAuthRoute =
    pathname === "/login" || pathname.startsWith("/api/auth");

  if (isPublicAuthRoute) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/student")) {
    return NextResponse.next();
  }

  const session = request.cookies.get("resillience_session")?.value;
  const role = readRole(session);

  if (!role) {
    const loginUrl = new URL(pathname.startsWith("/admin") ? "/admin/login" : "/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student", "/student/:path*"]
};
