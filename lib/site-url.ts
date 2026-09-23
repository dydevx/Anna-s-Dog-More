const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || LOCAL_SITE_URL;
  return configuredUrl.replace(/\/+$/, "");
}
