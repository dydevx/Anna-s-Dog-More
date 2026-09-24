"use server";

import { redirect } from "next/navigation";
import { resolveAdminLogin } from "@/lib/auth/admin-login";
import { createUserClient } from "@/lib/supabase/server";

export async function adminLoginAction(formData: FormData) {
  let loginFailed = false;

  try {
    const supabase = await createUserClient();
    const email = resolveAdminLogin(String(formData.get("identifier") ?? ""));
    const { error } = await supabase.auth.signInWithPassword({ email, password: String(formData.get("password") ?? "") });
    loginFailed = Boolean(error);
  } catch { redirect("/admin/login?error=config"); }

  if (loginFailed) redirect("/admin/login?error=invalid");
  redirect("/admin");
}
