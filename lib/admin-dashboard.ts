import type { SupabaseClient } from "@supabase/supabase-js";

export type DashboardSummary = {
  pending: number;
  low_stock: number;
  paid_count: number;
  revenue: Array<{ currency: string; total: number }>;
};

export async function getDashboardSummary(admin: SupabaseClient, since: string): Promise<DashboardSummary> {
  const { data, error } = await admin.rpc("admin_dashboard_summary", { p_since: since });
  if (!error && data) return data as DashboardSummary;
  if (error && !["PGRST202", "42883"].includes(error.code)) throw new Error("Unable to load dashboard summary");

  // Keep the app usable until the additive SQL migration is applied.
  const [pending, paid, variants] = await Promise.all([
    admin.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "pending_payment"),
    admin.from("orders").select("grand_total,currency").gte("created_at", since).eq("payment_status", "paid"),
    admin.from("product_variants").select("stock_quantity,low_stock_threshold").eq("active", true),
  ]);
  if (pending.error || paid.error || variants.error) throw new Error("Unable to load dashboard summary");
  const totals = new Map<string, number>();
  for (const order of paid.data ?? []) totals.set(order.currency, (totals.get(order.currency) ?? 0) + Number(order.grand_total));
  return {
    pending: pending.count ?? 0,
    low_stock: (variants.data ?? []).filter((variant) => Number(variant.stock_quantity) <= Number(variant.low_stock_threshold)).length,
    paid_count: paid.data?.length ?? 0,
    revenue: [...totals].map(([currency, total]) => ({ currency, total })),
  };
}
