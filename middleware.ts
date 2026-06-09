import { NextRequest, NextResponse } from "next/server";
import { decodeSessionToken } from "@/lib/session-token";

function readRole(session: string | undefined) {
  return decodeSessionToken(session)?.role ?? null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicAuthRoute =
    pathname === "/login" || pathname === "/admin/login" || pathname.startsWith("/api/auth");

  if (isPublicAuthRoute) {
    return NextResponse.next();
  }

  const session = request.cookies.get("resillience_session")?.value;
  const role = readRole(session);

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isStudentRoute = pathname.startsWith("/student") || pathname.startsWith("/api/students");

  if (!isAdminRoute && !isStudentRoute) {
    return NextResponse.next();
  }

  if (!role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL(isAdminRoute ? "/admin/login" : "/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && role !== "ADMIN") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isStudentRoute && role !== "STUDENT") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/student", "/student/:path*", "/api/admin/:path*", "/api/students/:path*"]
};
