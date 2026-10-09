import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { adminCookieOptions } from "@/lib/auth/admin-cookies";

export async function createUserClient() {
  return createCookieClient();
}

export async function createAdminUserClient() {
  return createCookieClient(adminCookieOptions());
}

async function createCookieClient(cookieOptions?: CookieOptionsWithName) {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_PUBLIC_NOT_CONFIGURED");
  return createServerClient(url, key, {
    cookieOptions,
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Components cannot always set cookies. */ }
      },
    },
  });
}
