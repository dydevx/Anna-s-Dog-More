import { adminLoginAction } from "./actions";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return <main className="admin-login"><form action={adminLoginAction}><div className="wordmark"><span>ANNA&apos;S</span><small>ADMIN</small></div><h1>Admin anmelden</h1>{query.error && <div className="form-alert">{query.error === "forbidden" ? "Dieses Konto hat keine Admin-Rolle." : query.error === "config" ? "Supabase Auth ist nicht konfiguriert." : "E-Mail oder Passwort ist ungültig."}</div>}<label>E-Mail<input name="email" type="email" required /></label><label>Passwort<input name="password" type="password" required /></label><button className="button primary-button full-button" type="submit">Anmelden</button></form></main>;
}
