import { NextResponse } from "next/server";
import { resolveAdminLogin } from "@/lib/auth/admin-login";
import { createAdminUserClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const identifier = formData?.get("identifier");
  const password = formData?.get("password");
  if (typeof identifier !== "string" || typeof password !== "string"
    || !identifier.trim() || !password || identifier.length > 320 || password.length > 1024) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  try {
    const supabase = await createAdminUserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: resolveAdminLogin(identifier), password,
    });
    if (error) return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/login?error=config", request.url), 303);
  }

  // A separate browser request checks that cookies really survived the login response.
  return NextResponse.redirect(new URL("/admin/session", request.url), 303);
}
