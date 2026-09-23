import { redirect } from "next/navigation";
import { resetPasswordAction } from "../actions";
import { createUserClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) redirect("/de/account");
  const user = await createUserClient().then((client) => client.auth.getUser()).then(({ data }) => data.user).catch(() => null);
  if (!user) redirect(`/${locale}/account?error=invalid`);
  const isDe = locale === "de";
  return <div className="page-shell account-shell"><header className="page-intro"><h1>{isDe ? "Neues Passwort" : "New password"}</h1><p>{isDe ? "Wählen Sie ein neues Passwort mit mindestens acht Zeichen." : "Choose a new password with at least eight characters."}</p></header>{query.error && <div className="form-alert">{isDe ? "Passwörter stimmen nicht überein oder die Sitzung ist abgelaufen." : "Passwords do not match or the session has expired."}</div>}<form action={resetPasswordAction} className="auth-form password-reset-form"><input type="hidden" name="locale" value={locale} /><label>{isDe ? "Neues Passwort" : "New password"}<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label>{isDe ? "Passwort wiederholen" : "Confirm password"}<input name="confirmation" type="password" minLength={8} required autoComplete="new-password" /></label><button className="button primary-button" type="submit">{isDe ? "Passwort speichern" : "Save password"}</button></form></div>;
}
