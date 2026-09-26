import Link from "next/link";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/auth/admin";
import { signOutAction } from "@/app/[locale]/account/actions";
import { AdminNavigation } from "@/components/admin/admin-navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <Link className="wordmark compact" href="/admin">
            <span>ANNA&apos;S</span>
            <small>ADMIN</small>
          </Link>
          <span>Shopverwaltung</span>
        </div>
        <AdminNavigation />
        <div className="admin-user">
          <Link className="admin-store-link" href="/de" target="_blank" rel="noreferrer">
            Zum Shop <ArrowSquareOut size={17} aria-hidden="true" />
          </Link>
          <small title={user.email}>{user.email}</small>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value="de" />
            <button type="submit"><SignOut size={18} aria-hidden="true" /><span>Abmelden</span></button>
          </form>
        </div>
      </aside>
      <main className="admin-main" id="admin-main">{children}</main>
    </div>
  );
}
