import Link from "next/link";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  const messages: Record<string, string> = {
    forbidden: "Dieses Konto hat keine Admin-Rolle.",
    config: "Die Anmeldung ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.",
    cookies: "Ihr Browser speichert die Anmeldung hier nicht. Öffnen Sie die Verwaltung direkt und melden Sie sich dort an.",
    session: "Die Anmeldung konnte nicht bestätigt werden. Bitte melden Sie sich erneut an.",
    invalid: "Benutzername oder Passwort ist ungültig.",
  };

  return (
    <main className="admin-login">
      <form action="/api/admin/login" method="post">
        <div className="wordmark"><span>ANNA&apos;S</span><small>ADMIN</small></div>
        <h1>Willkommen zurück</h1>
        <p className="admin-login-copy">Melden Sie sich an, um Produkte, Bestellungen und Versand zu verwalten.</p>
        {query.error && <div className="form-alert" role="alert">
          {messages[query.error] ?? messages.invalid}
        </div>}
        {query.error === "cookies" && <p className="admin-login-copy">
          <Link className="button primary-button full-button" href="/admin/login" target="_top" prefetch={false}>
            Admin direkt öffnen
          </Link>
        </p>}
        <label>Benutzername<input name="identifier" type="text" autoComplete="username" maxLength={320} required /></label>
        <label>Passwort<input name="password" type="password" autoComplete="current-password" maxLength={1024} required /></label>
        <button className="button primary-button full-button" type="submit">Anmelden</button>
      </form>
    </main>
  );
}
