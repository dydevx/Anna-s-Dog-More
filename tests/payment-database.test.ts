import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let db: PGlite;
const variantId = "20000000-0000-4000-8000-000000000001";
const methodId = "30000000-0000-4000-8000-000000000001";

async function order(quantity = 2) {
  const result = await db.query<{ order_id: string; grand_total: number }>(
    "select * from public.create_pending_order('en','buyer@example.ch','', $1::jsonb,$1::jsonb,$2,$3::jsonb)",
    [JSON.stringify({ country: "CH" }), methodId, JSON.stringify([{ variantId, quantity }])],
  );
  return result.rows[0].order_id;
}
async function capture(id: string, event = "evt_paid", amount = 25, session = "cs_test") {
  return db.query("select public.finalize_paid_order($1,'stripe',$2,$3,'unknown',$4,'CHF','checkout.session.completed','hash') as changed", [id, session, event, amount]);
}
async function event(id: string, outcome: string, eventId: string, amount = 25) {
  return db.query("select public.apply_payment_event($1,'stripe','cs_test',$2,$3,$4,'CHF','test','hash') as changed", [id, eventId, outcome, amount]);
}
async function state(id: string) {
  return (await db.query<{ payment_status: string; order_status: string }>("select payment_status,order_status from public.orders where id = $1", [id])).rows[0];
}
async function stock() {
  return (await db.query<{ stock_quantity: number }>("select stock_quantity from public.product_variants where id=$1", [variantId])).rows[0].stock_quantity;
}

describe("PostgreSQL payment lifecycle", () => {
  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as 'select null::uuid';
      create schema extensions; create extension pgcrypto with schema extensions;
    `);
    await db.exec(await readFile("database/migrations/001_initial_commerce.sql", "utf8"));
    const migration = await readFile("database/migrations/006_payment_lifecycle.sql", "utf8");
    await db.exec(migration);
    await db.exec(migration); // The SQL Editor migration must be safe to rerun.
    await db.exec(`
      insert into public.categories(id,slug,name_de,name_en) values('10000000-0000-4000-8000-000000000001','test','Test','Test');
      insert into public.products(id,category_id,slug,name_de,name_en,base_price,currency,active)
      values('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','test','Test','Test',10,'CHF',true);
      insert into public.product_variants(id,product_id,sku,article_number,price,currency,stock_quantity,active)
      values('${variantId}','10000000-0000-4000-8000-000000000002','TEST','TEST',10,'CHF',10,true);
      insert into public.shipping_zones(id,name,country_codes,active) values('30000000-0000-4000-8000-000000000002','Test',array['CH'],true);
      insert into public.shipping_methods(id,zone_id,name_de,name_en,active) values('${methodId}','30000000-0000-4000-8000-000000000002','Test','Test',true);
      insert into public.shipping_rates(method_id,currency,fee,active) values('${methodId}','CHF',5,true);
    `);
  }, 60000);
  beforeEach(async () => {
    await db.exec("truncate public.orders cascade; update public.product_variants set stock_quantity=10;");
    await db.exec("truncate public.payment_events;");
  });
  afterAll(async () => { await db?.close(); });

  it("captures once across duplicate and distinct successful events", async () => {
    const id = await order();
    await capture(id);
    await capture(id);
    await capture(id, "evt_async_paid");
    expect(await stock()).toBe(8);
    expect(await state(id)).toMatchObject({ payment_status: "paid", order_status: "paid" });
    expect((await db.query("select * from public.inventory_movements where type='sale'")).rows).toHaveLength(1);
  });
  it("rolls back wrong totals and allows the corrected event to retry", async () => {
    const id = await order();
    await expect(capture(id, "evt_wrong", 24)).rejects.toThrow("PAYMENT_TOTAL_MISMATCH");
    expect(await stock()).toBe(10);
    await capture(id, "evt_wrong", 25);
    expect(await stock()).toBe(8);
  });
  it("releases expired/failed holds and never downgrades a paid order", async () => {
    const id = await order();
    await event(id, "cancelled", "evt_expired");
    expect(await state(id)).toMatchObject({ payment_status: "cancelled" });
    expect((await db.query("select * from public.inventory_reservations where released_at is null")).rows).toHaveLength(0);
    await capture(id); // Out-of-order delivery can still reconcile a real payment.
    await event(id, "failed", "evt_failed_late");
    expect(await state(id)).toMatchObject({ payment_status: "paid" });
    expect(await stock()).toBe(8);
  });
  it("does not steal stock reserved by another order after the old hold expired", async () => {
    const old = await order(8);
    await event(old, "cancelled", "evt_expired", 85);
    await order(8);
    await expect(capture(old, "evt_late", 85)).rejects.toThrow("OUT_OF_STOCK_DURING_CAPTURE");
    expect(await stock()).toBe(10);
  });
  it("keeps refund amounts monotonic and ignores a late paid event", async () => {
    const id = await order();
    await expect(event(id, "refunded", "evt_refund", 5)).rejects.toThrow("PAYMENT_NOT_FINALIZED");
    await capture(id);
    await event(id, "refunded", "evt_refund", 5);
    expect(await state(id)).toMatchObject({ payment_status: "partially_refunded" });
    expect((await db.query("select public.admin_dashboard_summary(now()-interval '1 day') as summary")).rows[0]).toMatchObject({
      summary: { paid_count: 1, revenue: [{ currency: "CHF", total: 20 }] },
    });
    await event(id, "refunded", "evt_full_refund", 25);
    await event(id, "refunded", "evt_older_partial", 10);
    await capture(id, "evt_late_paid");
    expect(await state(id)).toMatchObject({ payment_status: "refunded", order_status: "refunded" });
    expect(await stock()).toBe(8); // Physical returns are a separate stock operation.
  });
  it("registers a session after capture without resetting payment status", async () => {
    const id = await order();
    await capture(id);
    await db.query("select public.register_payment_session($1,'stripe','cs_test',now()+interval '31 minutes')", [id]);
    expect((await db.query("select status from public.payments")).rows[0]).toMatchObject({ status: "paid" });
    expect((await db.query("select public.release_unpaid_order($1) as changed", [id])).rows[0]).toMatchObject({ changed: false });
  });
  it("rejects duplicate variants and protects Admin fulfillment", async () => {
    await expect(db.query("select * from public.create_pending_order('en','a@b.ch','',$1::jsonb,$1::jsonb,$2,$3::jsonb)",
      ['{"country":"CH"}', methodId, JSON.stringify([{ variantId, quantity: 6 }, { variantId, quantity: 6 }])])).rejects.toThrow("DUPLICATE_VARIANT");
    const id = await order();
    await expect(db.query("select public.update_order_fulfillment($1,'paid','unfulfilled')", [id])).rejects.toThrow("PAYMENT_REQUIRED");
    await expect(db.query("select public.update_order_fulfillment($1,'refunded','unfulfilled')", [id])).rejects.toThrow("REFUND_REQUIRED");
    await expect(db.query("select public.update_order_fulfillment($1,'cancelled','cancelled')", [id])).rejects.toThrow("PAYMENT_CANCELLATION_REQUIRED");
    await capture(id);
    await db.query("select public.update_order_fulfillment($1,'shipped','shipped')", [id]);
    expect(await state(id)).toMatchObject({ order_status: "shipped" });
  });
  it("denies browser roles access to elevated payment functions", async () => {
    const result = await db.query(`select has_function_privilege('anon','public.release_unpaid_order(uuid)','execute') as anon,
      has_function_privilege('authenticated','public.finalize_paid_order(uuid,text,text,text,text,numeric,character,text,text)','execute') as customer,
      has_function_privilege('service_role','public.release_unpaid_order(uuid)','execute') as service`);
    expect(result.rows[0]).toEqual({ anon: false, customer: false, service: true });
  });
  it("reuses a checkout key without reserving twice and rejects changed details", async () => {
    const key = "40000000-0000-4000-8000-000000000001";
    const create = (hash: string) => db.query<{ order_id: string }>(
      "select * from public.create_checkout_order($1,$2,'en','buyer@example.ch','',$3::jsonb,$3::jsonb,$4,$5::jsonb)",
      [key, hash, '{"country":"CH"}', methodId, JSON.stringify([{ variantId, quantity: 2 }])]);
    const first = await create("hash1");
    const retry = await create("hash1");
    expect(first.rows[0].order_id).toBe(retry.rows[0].order_id);
    expect((await db.query("select * from public.inventory_reservations")).rows).toHaveLength(1);
    await expect(create("hash2")).rejects.toThrow("CHECKOUT_KEY_REUSED");
  });
});
