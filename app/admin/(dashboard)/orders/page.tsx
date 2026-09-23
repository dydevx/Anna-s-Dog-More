import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  let request = createAdminClient().from("orders").select("id,order_number,email,order_status,payment_status,fulfillment_status,grand_total,currency,created_at").order("created_at", { ascending: false }).limit(100);
  if (query.status) request = request.eq("order_status", query.status);
  const { data } = await request;
  return <><header className="admin-page-heading"><div><p>Bestellverwaltung</p><h1>Bestellungen</h1></div><form><select name="status" defaultValue={query.status ?? ""}><option value="">Alle Status</option><option value="pending_payment">Zahlung offen</option><option value="paid">Bezahlt</option><option value="processing">In Bearbeitung</option><option value="shipped">Versendet</option></select><button className="button secondary-button">Filtern</button></form></header><section className="admin-table"><div className="admin-table-head"><span>Bestellung</span><span>Kunde</span><span>Status</span><span>Betrag</span></div>{(data ?? []).map((order) => <Link className="admin-table-row" href={`/admin/orders/${order.id}`} key={order.id}><div><strong>{order.order_number}</strong><small>{new Intl.DateTimeFormat("de-CH").format(new Date(order.created_at))}</small></div><span>{order.email}</span><span className="status-chip">{order.order_status.replaceAll("_", " ")}</span><b>{formatMoney(Number(order.grand_total), order.currency, "de")}</b></Link>)}</section></>;
}
