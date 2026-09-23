import "server-only";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  try {
    const supabase = await createUserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/admin/login");
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (data?.role !== "admin") redirect("/admin/login?error=forbidden");
    return user;
  } catch { redirect("/admin/login?error=config"); }
}
