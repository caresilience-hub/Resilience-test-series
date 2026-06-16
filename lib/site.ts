const DEFAULT_SITE_URL = "https://resilience-test-series.vercel.app";

export function getSiteUrl() {
  const raw = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}
