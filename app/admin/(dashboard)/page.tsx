import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();
  const admin = createAdminClient();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const [{ data: recent }, { count: pending }, { data: today }, { count: lowStock }] = await Promise.all([
    admin.from("orders").select("id,order_number,email,grand_total,currency,order_status,created_at").order("created_at", { ascending: false }).limit(8),
    admin.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending_payment"),
    admin.from("orders").select("grand_total,currency").gte("created_at", start.toISOString()).eq("payment_status", "paid"),
    admin.from("product_variants").select("id", { count: "exact", head: true }).filter("stock_quantity", "lte", "low_stock_threshold").eq("active", true),
  ]);
  const revenue = (today ?? []).reduce((sum, order) => sum + Number(order.grand_total), 0);
  return <><header className="admin-page-heading"><div><p>Mittwoch, Shopstatus</p><h1>Übersicht</h1></div></header><section className="admin-metrics"><article><span>Umsatz heute</span><strong>{formatMoney(revenue, today?.[0]?.currency ?? "EUR", "de")}</strong></article><article><span>Offene Zahlungen</span><strong>{pending ?? 0}</strong></article><article><span>Niedriger Bestand</span><strong>{lowStock ?? 0}</strong></article></section><section className="admin-section"><div className="admin-section-heading"><h2>Letzte Bestellungen</h2></div><div className="admin-table"><div className="admin-table-head"><span>Bestellung</span><span>Kunde</span><span>Status</span><span>Betrag</span></div>{(recent ?? []).map((order) => <a className="admin-table-row" href={`/admin/orders/${order.id}`} key={order.id}><strong>{order.order_number}</strong><span>{order.email}</span><span className="status-chip">{order.order_status.replaceAll("_", " ")}</span><b>{formatMoney(Number(order.grand_total), order.currency, "de")}</b></a>)}</div></section></>;
}
