import { randomUUID } from "crypto";

export function buildSessionToken(userId: string, role: "STUDENT" | "ADMIN") {
  return Buffer.from(JSON.stringify({ userId, role, tokenId: randomUUID() })).toString("base64url");
}

export function readSessionToken(token: string) {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      userId: string;
      role: "STUDENT" | "ADMIN";
      tokenId: string;
    };
  } catch {
    return null;
  }
}

