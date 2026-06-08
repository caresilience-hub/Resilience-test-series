import { NextRequest } from "next/server";

export function shouldUseSecureCookies(request: NextRequest | { url: string }) {
  const hostname = new URL(request.url).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") {
    return false;
  }

  return process.env.NODE_ENV === "production";
}
