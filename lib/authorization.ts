import type { NextRequest } from "next/server";
import { decodeSessionToken } from "@/lib/session-token";

export type SessionRole = "STUDENT" | "ADMIN";

export function readRoleFromToken(token?: string) {
  return decodeSessionToken(token)?.role ?? null;
}

export function readRoleFromRequest(request: NextRequest) {
  const token = request.cookies.get("resillience_session")?.value;
  return readRoleFromToken(token);
}

export function readSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get("resillience_session")?.value;
  return decodeSessionToken(token);
}
