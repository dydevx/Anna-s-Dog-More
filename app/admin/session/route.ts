import { NextResponse } from "next/server";
import { createAdminUserClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  let destination = "/admin/login?error=cookies";
  try {
    const supabase = await createAdminUserClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") destination = "/admin/login?error=session";
    if (user) destination = "/admin";
  } catch {
    destination = "/admin/login?error=config";
  }
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
