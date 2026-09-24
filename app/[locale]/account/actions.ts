"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { createUserClient } from "@/lib/supabase/server";
import { getRequestSiteUrl } from "@/lib/site-url";

function localeFrom(formData: FormData) {
  return formData.get("locale") === "en" ? "en" : "de";
}

export async function signInAction(formData: FormData) {
  const locale = localeFrom(formData);
  try {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") });
    if (error) redirect(`/${locale}/account?error=invalid`);
  } catch { redirect(`/${locale}/account?error=config`); }
  redirect(`/${locale}/account`);
}

export async function signUpAction(formData: FormData) {
  const locale = localeFrom(formData);
  try {
    const supabase = await createUserClient();
    const base = getRequestSiteUrl(await headers());
    const { error } = await supabase.auth.signUp({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      options: {
        data: { locale },
        emailRedirectTo: `${base}/auth/callback?next=/${locale}/account`,
      },
    });
    if (error) redirect(`/${locale}/account?error=signup`);
  } catch { redirect(`/${locale}/account?error=config`); }
  redirect(`/${locale}/account?message=check-email`);
}

export async function forgotPasswordAction(formData: FormData) {
  const locale = localeFrom(formData);
  try {
    const supabase = await createUserClient();
    const base = getRequestSiteUrl(await headers());
    await supabase.auth.resetPasswordForEmail(String(formData.get("email") ?? ""), { redirectTo: `${base}/auth/callback?next=/${locale}/account/reset` });
  } catch { redirect(`/${locale}/account?error=config`); }
  redirect(`/${locale}/account?message=check-email`);
}

export async function signOutAction(formData: FormData) {
  const locale = localeFrom(formData);
  try { await (await createUserClient()).auth.signOut(); } catch { /* Already signed out. */ }
  redirect(`/${locale}`);
}

const addressSchema = z.object({
  locale: z.enum(["de", "en"]),
  label: z.string().trim().max(80),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  street: z.string().trim().min(2).max(120),
  house_number: z.string().trim().min(1).max(20),
  postal_code: z.string().trim().min(2).max(20),
  city: z.string().trim().min(2).max(100),
  country_code: z.string().length(2).transform((value) => value.toUpperCase()),
});

export async function addAddressAction(formData: FormData) {
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  const locale = localeFrom(formData);
  if (!parsed.success) redirect(`/${locale}/account?error=address`);
  const supabase = await createUserClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) redirect(`/${locale}/account?error=auth`);
  const { locale: _locale, ...address } = parsed.data;
  void _locale;
  const { error } = await supabase.from("addresses").insert({ ...address, user_id: user.id });
  if (error) redirect(`/${locale}/account?error=address`);
  revalidatePath(`/${locale}/account`);
  redirect(`/${locale}/account?message=address-saved`);
}

export async function deleteAddressAction(formData: FormData) {
  const locale = localeFrom(formData);
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) redirect(`/${locale}/account?error=address`);
  const supabase = await createUserClient();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) redirect(`/${locale}/account?error=auth`);
  const { error } = await supabase.from("addresses").delete().eq("id", id.data).eq("user_id", user.id);
  if (error) redirect(`/${locale}/account?error=address`);
  revalidatePath(`/${locale}/account`);
  redirect(`/${locale}/account?message=address-deleted`);
}

export async function resetPasswordAction(formData: FormData) {
  const locale = localeFrom(formData);
  const parsed = z.object({ password: z.string().min(8).max(128), confirmation: z.string() }).refine((data) => data.password === data.confirmation).safeParse({ password: formData.get("password"), confirmation: formData.get("confirmation") });
  if (!parsed.success) redirect(`/${locale}/account/reset?error=password`);
  const supabase = await createUserClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(`/${locale}/account/reset?error=session`);
  redirect(`/${locale}/account?message=password-updated`);
}
