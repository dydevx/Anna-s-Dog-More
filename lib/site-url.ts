const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;

  try {
    const candidate = value.includes("://") ? value : `https://${value}`;
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
    ?? normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    ?? LOCAL_SITE_URL;
}

export function getRequestSiteUrl(requestHeaders: Headers) {
  const configuredUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredUrl) return configuredUrl;

  // Next.js validates the Origin header for Server Actions before they run.
  return normalizeSiteUrl(requestHeaders.get("origin"))
    ?? normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    ?? LOCAL_SITE_URL;
}
