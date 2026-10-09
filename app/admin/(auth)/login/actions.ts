"use server";

import { redirect } from "next/navigation";
import { createAdminUserClient } from "@/lib/supabase/server";

export async function adminSignOutAction() {
  try {
    const supabase = await createAdminUserClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw error;
  } catch { redirect("/admin?error=signout"); }
  redirect("/admin/login");
}
