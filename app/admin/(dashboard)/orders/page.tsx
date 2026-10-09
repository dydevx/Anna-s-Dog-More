import Link from "next/link";
import { FunnelSimple, Package } from "@phosphor-icons/react/dist/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminStatus } from "@/components/admin/admin-status";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { adminPage, ADMIN_PAGE_SIZE } from "@/lib/admin-pagination";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const page = adminPage(query.page);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;
  let request = createAdminClient().from("orders").select("id,order_number,email,order_status,payment_status,fulfillment_status,grand_total,currency,created_at").order("created_at", { ascending: false }).order("id").range(offset, offset + ADMIN_PAGE_SIZE);
  if (query.status) request = request.eq("order_status", query.status);
  const { data } = await request;
  const orders = (data ?? []).slice(0, ADMIN_PAGE_SIZE);

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <p>Bestellverwaltung</p>
          <h1>Bestellungen</h1>
          <span>{orders.length} Einträge auf dieser Seite</span>
        </div>
        <form className="admin-filter" aria-label="Bestellungen filtern">
          <FunnelSimple size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="order-status">Status</label>
          <select id="order-status" name="status" defaultValue={query.status ?? ""}>
            <option value="">Alle Status</option>
            <option value="pending_payment">Zahlung offen</option>
            <option value="paid">Bezahlt</option>
            <option value="processing">In Bearbeitung</option>
            <option value="shipped">Versendet</option>
          </select>
          <button className="button secondary-button">Anwenden</button>
          {query.status && <Link className="admin-filter-reset" href="/admin/orders">Zurücksetzen</Link>}
        </form>
      </header>

      <section className="admin-section admin-table-section" aria-label="Bestellliste">
        {orders.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-orders-table">
              <thead><tr><th>Bestellung</th><th>Kunde</th><th>Zahlung</th><th>Status</th><th className="admin-align-right">Betrag</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td><Link className="admin-primary-link" href={`/admin/orders/${order.id}`}>{order.order_number}</Link><small>{new Intl.DateTimeFormat("de-CH", { dateStyle: "medium" }).format(new Date(order.created_at))}</small></td>
                    <td>{order.email}</td>
                    <td><AdminStatus status={order.payment_status} /></td>
                    <td><AdminStatus status={order.order_status} /></td>
                    <td className="admin-align-right"><strong>{formatMoney(Number(order.grand_total), order.currency, "de")}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state"><Package size={30} aria-hidden="true" /><strong>Keine Bestellungen gefunden</strong><span>Ändern Sie den Filter oder warten Sie auf die nächste Bestellung.</span></div>
        )}
      </section>
      <AdminPagination page={page} hasNext={(data?.length ?? 0) > ADMIN_PAGE_SIZE} count={orders.length} pathname="/admin/orders" status={query.status} />
    </>
  );
}
