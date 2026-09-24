"use server";

import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export async function adminLoginAction(formData: FormData) {
  let loginFailed = false;

  try {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") });
    loginFailed = Boolean(error);
  } catch { redirect("/admin/login?error=config"); }

  if (loginFailed) redirect("/admin/login?error=invalid");
  redirect("/admin");
}
