import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin öffnen",
  robots: { index: false, follow: false },
};

export default function OpenAdminPage() {
  return (
    <main className="admin-login">
      <section className="admin-login-card" aria-labelledby="admin-open-heading">
        <div className="wordmark"><span>ANNA&apos;S</span><small>ADMIN</small></div>
        <h1 id="admin-open-heading">Shop verwalten</h1>
        <p className="admin-login-copy">
          Öffnen Sie die Verwaltung direkt, damit Sie beim Wechsel zwischen
          Produkten, Bestellungen und Versand angemeldet bleiben.
        </p>
        <Link className="button primary-button full-button" href="/admin" target="_top" prefetch={false}>
          Admin öffnen
        </Link>
      </section>
    </main>
  );
}
