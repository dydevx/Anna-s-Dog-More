import Link from "next/link";
import {
  ArrowRight,
  CurrencyCircleDollar,
  Package,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminStatus } from "@/components/admin/admin-status";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();
  const admin = createAdminClient();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [{ data: recent }, { count: pending }, { data: today }, { count: lowStock }] = await Promise.all([
    admin.from("orders").select("id,order_number,email,grand_total,currency,order_status,created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending_payment"),
    admin.from("orders").select("grand_total,currency").gte("created_at", start.toISOString()).eq("payment_status", "paid"),
    admin.from("product_variants").select("id", { count: "exact", head: true }).filter("stock_quantity", "lte", "low_stock_threshold").eq("active", true),
  ]);

  const revenue = (today ?? []).reduce((sum, order) => sum + Number(order.grand_total), 0);
  const formattedDate = new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p>{formattedDate}</p>
          <h1>Shop im Überblick</h1>
          <span>Die wichtigsten Aufgaben und Shop-Signale auf einen Blick.</span>
        </div>
        <Link className="button secondary-button" href="/admin/orders">
          Bestellungen öffnen <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </header>

      <section className="admin-metrics" aria-label="Shop Kennzahlen">
        <article>
          <div><span>Umsatz heute</span><CurrencyCircleDollar size={22} aria-hidden="true" /></div>
          <strong>{formatMoney(revenue, today?.[0]?.currency ?? "CHF", "de")}</strong>
          <small>{today?.length ?? 0} {(today?.length ?? 0) === 1 ? "bezahlte Bestellung" : "bezahlte Bestellungen"}</small>
        </article>
        <article>
          <div><span>Offene Zahlungen</span><Package size={22} aria-hidden="true" /></div>
          <strong>{pending ?? 0}</strong>
          <small>Bestellungen warten auf Zahlung</small>
        </article>
        <article data-alert={(lowStock ?? 0) > 0 ? "true" : undefined}>
          <div><span>Niedriger Bestand</span><WarningCircle size={22} aria-hidden="true" /></div>
          <strong>{lowStock ?? 0}</strong>
          <small>aktive Varianten prüfen</small>
        </article>
      </section>

      <section className="admin-section admin-table-section">
        <div className="admin-section-heading admin-section-heading-row">
          <div>
            <h2>Letzte Bestellungen</h2>
            <p>Die acht zuletzt eingegangenen Bestellungen.</p>
          </div>
          <Link className="admin-inline-link" href="/admin/orders">Alle anzeigen <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        {(recent ?? []).length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead><tr><th>Bestellung</th><th>Kunde</th><th>Status</th><th className="admin-align-right">Betrag</th></tr></thead>
              <tbody>
                {(recent ?? []).map((order) => (
                  <tr key={order.id}>
                    <td><Link className="admin-primary-link" href={`/admin/orders/${order.id}`}>{order.order_number}</Link><small>{new Intl.DateTimeFormat("de-CH").format(new Date(order.created_at))}</small></td>
                    <td>{order.email}</td>
                    <td><AdminStatus status={order.order_status} /></td>
                    <td className="admin-align-right"><strong>{formatMoney(Number(order.grand_total), order.currency, "de")}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state"><Package size={28} aria-hidden="true" /><strong>Noch keine Bestellungen</strong><span>Neue Bestellungen erscheinen automatisch hier.</span></div>
        )}
      </section>
    </>
  );
}
