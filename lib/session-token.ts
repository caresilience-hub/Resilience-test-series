export type SessionPayload = {
  userId: string;
  role: "STUDENT" | "ADMIN";
  tokenId: string;
};

function normalizeBase64Url(token: string) {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  return padding ? `${normalized}${"=".repeat(4 - padding)}` : normalized;
}

export function decodeSessionToken(token?: string | null): SessionPayload | null {
  if (!token) {
    return null;
  }

  try {
    const decoded = atob(normalizeBase64Url(token));
    return JSON.parse(decoded) as SessionPayload;
  } catch {
    return null;
  }
}
