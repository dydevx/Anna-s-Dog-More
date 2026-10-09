import { NextResponse, type NextRequest } from "next/server";
import { refreshAdminSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  const isAdminPage = request.nextUrl.pathname === "/admin"
    || request.nextUrl.pathname.startsWith("/admin/");
  if (request.method === "GET" && isAdminPage
    && request.nextUrl.pathname !== "/admin/open"
    && request.headers.get("sec-fetch-dest") === "iframe") {
    // Open a first-party page before login rather than relying on cross-site cookies.
    const destination = new URL("/admin/open", request.url);
    const response = NextResponse.rewrite(destination);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  return refreshAdminSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
