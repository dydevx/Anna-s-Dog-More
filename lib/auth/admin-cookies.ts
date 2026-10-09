import type { CookieOptionsWithName } from "@supabase/ssr";

export function adminCookieOptions(): CookieOptionsWithName {
  const production = process.env.NODE_ENV === "production";
  return {
    // Keep embedded admin sessions separate from storefront account cookies.
    name: "annas-admin-auth",
    path: "/",
    httpOnly: true,
    secure: production,
    sameSite: production ? "none" : "lax",
    partitioned: production,
  };
}
