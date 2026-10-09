import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function refreshAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Authenticated responses must never be shared by a CDN.
  response.headers.set("Cache-Control", "private, no-store");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, cacheHeaders) => {
        // The current render and the next browser request need the same tokens.
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        const previousResponse = response;
        response = NextResponse.next({ request });
        previousResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
        for (const name of ["cache-control", "expires", "pragma"]) {
          const value = previousResponse.headers.get(name);
          if (value) response.headers.set(name, value);
        }
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch {
    // Page and API guards still verify authentication and admin permissions.
  }
  return response;
}
