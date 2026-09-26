import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { updateOrderAction } from "../../actions";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminStatus } from "@/components/admin/admin-status";

export default async function AdminOrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { data: order } = await createAdminClient().from("orders").select("*,order_items(*),payments(*)").eq("id", id).single();
  if (!order) notFound();
  const address = order.shipping_address as Record<string, string>;

  return (
    <>
      <Link className="admin-back-link" href="/admin/orders"><ArrowLeft size={16} aria-hidden="true" /> Zurück zu Bestellungen</Link>
      <header className="admin-page-heading admin-detail-heading">
        <div>
          <p>{new Intl.DateTimeFormat("de-CH", { dateStyle: "long", timeStyle: "short" }).format(new Date(order.created_at))}</p>
          <h1>{order.order_number}</h1>
          <AdminStatus status={order.order_status} />
        </div>
        <strong>{formatMoney(Number(order.grand_total), order.currency, "de")}</strong>
      </header>

      {query.saved && <div className="admin-success" role="status">Status gespeichert.</div>}
      {query.error && <div className="form-alert" role="alert">Status konnte nicht gespeichert werden.</div>}

      <div className="order-admin-grid">
        <section className="admin-section">
          <div className="admin-section-heading"><h2>Positionen</h2><p>{order.order_items.length} Positionen in dieser Bestellung</p></div>
          {order.order_items.map((item: Record<string, unknown>) => (
            <div className="order-admin-item" key={String(item.id)}>
              <div><strong>{String(item.product_name)}</strong><small>{String(item.variant_description)} · SKU {String(item.sku)}</small></div>
              <span>{String(item.quantity)}×</span>
              <b>{formatMoney(Number(item.line_total), order.currency, "de")}</b>
            </div>
          ))}
        </section>

        <aside>
          <section className="admin-panel">
            <h2>Status bearbeiten</h2>
            <form action={updateOrderAction}>
              <input type="hidden" name="id" value={order.id} />
              <label>Bestellung<select name="order_status" defaultValue={order.order_status}><option value="pending_payment">Zahlung offen</option><option value="paid">Bezahlt</option><option value="processing">In Bearbeitung</option><option value="shipped">Versendet</option><option value="completed">Abgeschlossen</option><option value="cancelled">Storniert</option><option value="refunded">Erstattet</option></select></label>
              <label>Versand<select name="fulfillment_status" defaultValue={order.fulfillment_status}><option value="unfulfilled">Offen</option><option value="processing">In Bearbeitung</option><option value="shipped">Versendet</option><option value="fulfilled">Erfüllt</option><option value="cancelled">Storniert</option></select></label>
              <button className="button primary-button full-button">Status speichern</button>
            </form>
            <dl><div><dt>Zahlung</dt><dd><AdminStatus status={order.payment_status} /></dd></div></dl>
          </section>
          <section className="admin-panel">
            <h2>Lieferadresse</h2>
            <address>{address.firstName} {address.lastName}<br />{address.street} {address.houseNumber}<br />{address.postalCode} {address.city}<br />{address.country}</address>
          </section>
        </aside>
      </div>
    </>
  );
}
