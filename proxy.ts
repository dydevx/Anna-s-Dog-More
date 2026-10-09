import { NextResponse, type NextRequest } from "next/server";
import { refreshAdminSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/admin/")
    && !["GET", "HEAD", "OPTIONS"].includes(request.method)
    && request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const response = await refreshAdminSession(request);
  response.headers.set("Content-Security-Policy",
    "frame-ancestors 'self' https://annasdogandmore.com https://www.annasdogandmore.com");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
