import Link from "next/link";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react/dist/ssr";
import { requireAdmin } from "@/lib/auth/admin";
import { adminSignOutAction } from "@/app/admin/(auth)/login/actions";
import { AdminNavigation } from "@/components/admin/admin-navigation";

export const dynamic = "force-dynamic";
const ADMIN_DISPLAY_NAME = "admin@anna's-dog&more.com";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
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
          <small title={ADMIN_DISPLAY_NAME}>{ADMIN_DISPLAY_NAME}</small>
          <form action={adminSignOutAction}>
            <button type="submit"><SignOut size={18} aria-hidden="true" /><span>Abmelden</span></button>
          </form>
        </div>
      </aside>
      <main className="admin-main" id="admin-main">{children}</main>
    </div>
  );
}
