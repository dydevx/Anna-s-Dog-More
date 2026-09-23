"use server";

import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export async function adminLoginAction(formData: FormData) {
  try {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") });
    if (error) redirect("/admin/login?error=invalid");
  } catch { redirect("/admin/login?error=config"); }
  redirect("/admin");
}
