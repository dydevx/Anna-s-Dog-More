import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createUserClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  let supabase: Awaited<ReturnType<typeof createUserClient>>;
  let user: User | null;

  try {
    supabase = await createUserClient();
    ({ data: { user } } = await supabase.auth.getUser());
  } catch { redirect("/admin/login?error=config"); }

  if (!user) redirect("/admin/login");

  let role: string | undefined;
  try {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (error && error.code !== "PGRST116") throw error;
    role = data?.role;
  } catch { redirect("/admin/login?error=config"); }

  if (role !== "admin") redirect("/admin/login?error=forbidden");
  return user;
}
