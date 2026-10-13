-- Run after 005 in Supabase SQL Editor as postgres. Additive and rerunnable.
begin;
set local role postgres;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.orders add column if not exists checkout_key uuid;
alter table public.orders add column if not exists checkout_hash text;
create unique index if not exists orders_checkout_key_idx on public.orders(checkout_key) where checkout_key is not null;

create or replace function public.create_checkout_order(
  p_checkout_key uuid, p_checkout_hash text, p_locale text, p_email text, p_phone text,
  p_shipping_address jsonb, p_billing_address jsonb, p_shipping_method_id uuid, p_items jsonb, p_customer_id uuid default null
) returns table(order_id uuid, order_number text, public_token uuid, grand_total numeric, currency char(3), payment_expires_at bigint)
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_id uuid;
begin
  if p_checkout_key is null or p_checkout_hash is null then raise exception 'INVALID_CHECKOUT_KEY'; end if;
  -- Serialize requests sharing the same key before any inventory is reserved.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_checkout_key::text,0));
  select o.* into v_order from public.orders o where o.checkout_key = p_checkout_key;
  if found then
    if v_order.checkout_hash <> p_checkout_hash then raise exception 'CHECKOUT_KEY_REUSED'; end if;
    if v_order.payment_status in ('failed','cancelled') then raise exception 'CHECKOUT_EXPIRED'; end if;
    if v_order.payment_status = 'pending' and v_order.created_at + interval '37 minutes' <= now() then raise exception 'CHECKOUT_EXPIRED'; end if;
  else
    select pending.order_id into v_id from public.create_pending_order(p_locale,p_email,p_phone,p_shipping_address,
      p_billing_address,p_shipping_method_id,p_items,p_customer_id) pending;
    update public.orders set checkout_key = p_checkout_key, checkout_hash = p_checkout_hash where id = v_id;
    select o.* into v_order from public.orders o where o.id = v_id;
  end if;
  return query select v_order.id,v_order.order_number,v_order.public_token,v_order.grand_total,v_order.currency,
    floor(extract(epoch from v_order.created_at + interval '32 minutes'))::bigint;
end;
$$;

create or replace function public.create_pending_order(
  p_locale text,
  p_email text,
  p_phone text,
  p_shipping_address jsonb,
  p_billing_address jsonb,
  p_shipping_method_id uuid,
  p_items jsonb,
  p_customer_id uuid default null
) returns table(order_id uuid, order_number text, public_token uuid, grand_total numeric, currency char(3))
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := public.next_order_number();
  v_subtotal numeric(12,2) := 0;
  v_shipping numeric(12,2);
  v_currency char(3);
  v_country char(2) := upper(p_shipping_address->>'country');
  v_item jsonb;
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
  v_quantity integer;
  v_reserved integer;
  v_method public.shipping_methods%rowtype;
  v_rate public.shipping_rates%rowtype;
begin
  if p_locale not in ('de','en') or p_email is null or jsonb_array_length(p_items) = 0 then
    raise exception 'INVALID_ORDER_INPUT';
  end if;

  if (select count(*) <> count(distinct value->>'variantId') from jsonb_array_elements(p_items)) then raise exception 'DUPLICATE_VARIANT'; end if;

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'variantId'
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 then raise exception 'INVALID_QUANTITY'; end if;

    select * into v_variant from public.product_variants where id = (v_item->>'variantId')::uuid for update;
    if not found or not v_variant.active or v_variant.price is null then raise exception 'INVALID_VARIANT'; end if;
    select * into v_product from public.products where id = v_variant.product_id and active;
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

    select coalesce(sum(quantity), 0) into v_reserved
    from public.inventory_reservations
    where variant_id = v_variant.id and released_at is null and consumed_at is null and expires_at > now();
    if v_variant.stock_quantity - v_reserved < v_quantity then raise exception 'OUT_OF_STOCK:%', v_variant.sku; end if;
    if v_currency is null then v_currency := v_variant.currency;
    elsif v_currency <> v_variant.currency then raise exception 'MIXED_CURRENCY'; end if;
    v_subtotal := v_subtotal + (v_variant.price * v_quantity);
  end loop;

  select sm.* into v_method from public.shipping_methods sm
  join public.shipping_zones sz on sz.id = sm.zone_id
  where sm.id = p_shipping_method_id and sm.active and sz.active and v_country = any(sz.country_codes);
  if not found then raise exception 'SHIPPING_UNAVAILABLE'; end if;

  select sr.* into v_rate from public.shipping_rates sr
  where sr.method_id = p_shipping_method_id and sr.currency = v_currency and sr.active
  order by sr.min_weight_grams nulls first limit 1;
  if not found then raise exception 'SHIPPING_UNAVAILABLE'; end if;
  v_shipping := case when v_rate.free_shipping_threshold is not null and v_subtotal >= v_rate.free_shipping_threshold then 0 else v_rate.fee end;

  insert into public.orders(id, order_number, customer_id, locale, email, phone, subtotal, shipping_total, grand_total, currency, shipping_method_id, shipping_address, billing_address)
  values(v_order_id, v_order_number, p_customer_id, p_locale, lower(trim(p_email)), p_phone, v_subtotal, v_shipping, v_subtotal + v_shipping, v_currency, p_shipping_method_id, p_shipping_address, p_billing_address);

  for v_item in select value from jsonb_array_elements(p_items) order by value->>'variantId'
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_variant from public.product_variants where id = (v_item->>'variantId')::uuid;
    select * into v_product from public.products where id = v_variant.product_id;
    insert into public.order_items(order_id, product_id, variant_id, sku, product_name, variant_description, unit_price, quantity, line_total)
    values(v_order_id, v_product.id, v_variant.id, v_variant.sku,
      case when p_locale = 'en' then v_product.name_en else v_product.name_de end,
      concat_ws(' / ', v_variant.size, v_variant.color, v_variant.fabric, v_variant.mattress_type, v_variant.configuration, v_variant.capacity),
      v_variant.price, v_quantity, v_variant.price * v_quantity);
    insert into public.inventory_reservations(order_id, variant_id, quantity, expires_at)
    values(v_order_id, v_variant.id, v_quantity, now() + interval '36 minutes');
  end loop;

  return query select v_order_id, v_order_number, (select o.public_token from public.orders o where o.id = v_order_id), v_subtotal + v_shipping, v_currency;
end;
$$;

alter table public.payments add column if not exists refunded_amount numeric(12,2) not null default 0
  check (refunded_amount >= 0 and refunded_amount <= amount);

create or replace function public.register_payment_session(
  p_order_id uuid, p_provider text, p_provider_payment_id text, p_expires_at timestamptz
) returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_expires_at is null or p_expires_at <= now() then raise exception 'INVALID_PAYMENT_EXPIRY'; end if;
  insert into public.payments(order_id, provider, provider_payment_id, amount, currency)
  values(p_order_id, p_provider, p_provider_payment_id, v_order.grand_total, v_order.currency)
  on conflict(provider, provider_payment_id) do nothing;
  if not exists(select 1 from public.payments where provider = p_provider
    and provider_payment_id = p_provider_payment_id and order_id = p_order_id) then
    raise exception 'PAYMENT_ORDER_MISMATCH';
  end if;
  -- A webhook can arrive before this registration. Never reset its paid status.
  if v_order.payment_status = 'pending' then
    update public.inventory_reservations set expires_at = p_expires_at + interval '5 minutes'
    where order_id = p_order_id and released_at is null and consumed_at is null;
  end if;
end;
$$;

create or replace function public.release_unpaid_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_status not in ('pending','failed','cancelled') then return false; end if;
  update public.inventory_reservations set released_at = now()
    where order_id = p_order_id and released_at is null and consumed_at is null;
  update public.orders set order_status = 'cancelled', payment_status = 'cancelled', fulfillment_status = 'cancelled'
    where id = p_order_id;
  update public.payments set status = 'cancelled' where order_id = p_order_id and status = 'pending';
  return true;
end;
$$;

create or replace function public.finalize_paid_order(
  p_order_id uuid, p_provider text, p_provider_payment_id text, p_provider_event_id text,
  p_method text, p_amount numeric, p_currency char(3), p_event_type text, p_payload_hash text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_stock integer;
  v_reserved integer;
begin
  insert into public.payment_events(provider, provider_event_id, event_type, payload_hash)
  values(p_provider, p_provider_event_id, p_event_type, p_payload_hash)
  on conflict(provider, provider_event_id) do nothing;
  if not found then return false; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.grand_total <> p_amount or v_order.currency <> p_currency then
    raise exception 'PAYMENT_TOTAL_MISMATCH';
  end if;
  if exists(select 1 from public.payments where provider = p_provider
    and provider_payment_id = p_provider_payment_id and order_id <> p_order_id) then
    raise exception 'PAYMENT_ORDER_MISMATCH';
  end if;
  if v_order.payment_status in ('paid','partially_refunded','refunded') then
    if not exists(select 1 from public.payments where order_id = p_order_id
      and provider = p_provider and provider_payment_id = p_provider_payment_id
      and status in ('paid','partially_refunded','refunded')) then
      raise exception 'DUPLICATE_ORDER_PAYMENT';
    end if;
    return false;
  end if;
  if not exists(select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'ORDER_ITEMS_MISSING';
  end if;
  -- Use immutable order quantities, even if an expiry event released a hold first.
  -- Lock variants in the same order as create_pending_order to avoid deadlocks.
  for v_item in select variant_id, sum(quantity)::integer as quantity from public.order_items
    where order_id = p_order_id group by variant_id order by variant_id
  loop
    select stock_quantity into v_stock from public.product_variants where id = v_item.variant_id for update;
    if not found then raise exception 'INVALID_VARIANT'; end if;
    select coalesce(sum(quantity),0)::integer into v_reserved from public.inventory_reservations
      where variant_id = v_item.variant_id and order_id <> p_order_id
        and released_at is null and consumed_at is null and expires_at > now();
    if v_stock - v_reserved < v_item.quantity then raise exception 'OUT_OF_STOCK_DURING_CAPTURE'; end if;
    update public.product_variants set stock_quantity = stock_quantity - v_item.quantity where id = v_item.variant_id;
    insert into public.inventory_movements(variant_id, type, quantity, reference, order_id)
      values(v_item.variant_id, 'sale', -v_item.quantity, p_provider_payment_id, p_order_id);
  end loop;
  update public.inventory_reservations set consumed_at = now() where order_id = p_order_id and consumed_at is null;
  insert into public.payments(order_id, provider, provider_payment_id, method, amount, currency, status)
    values(p_order_id, p_provider, p_provider_payment_id, p_method, p_amount, p_currency, 'paid')
    on conflict(provider, provider_payment_id) do update set status = 'paid', method = excluded.method;
  update public.orders set payment_status = 'paid', order_status = 'paid', paid_at = now(), fulfillment_status = 'unfulfilled'
    where id = p_order_id;
  return true;
end;
$$;

create or replace function public.apply_payment_event(
  p_order_id uuid, p_provider text, p_provider_payment_id text, p_provider_event_id text,
  p_outcome text, p_amount numeric, p_currency char(3), p_event_type text, p_payload_hash text
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_refunded numeric(12,2);
begin
  if p_outcome not in ('pending','failed','cancelled','refunded') then raise exception 'INVALID_PAYMENT_OUTCOME'; end if;
  insert into public.payment_events(provider, provider_event_id, event_type, payload_hash)
    values(p_provider, p_provider_event_id, p_event_type, p_payload_hash)
    on conflict(provider, provider_event_id) do nothing;
  if not found then return false; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.currency <> p_currency then raise exception 'PAYMENT_TOTAL_MISMATCH'; end if;
  if exists(select 1 from public.payments where provider = p_provider
    and provider_payment_id = p_provider_payment_id and order_id <> p_order_id) then raise exception 'PAYMENT_ORDER_MISMATCH'; end if;
  if p_outcome = 'refunded' then
    -- A refund may arrive before the paid event. Roll back so Stripe can retry.
    if v_order.payment_status not in ('paid','partially_refunded','refunded') then raise exception 'PAYMENT_NOT_FINALIZED'; end if;
    if p_amount <= 0 or p_amount > v_order.grand_total then raise exception 'INVALID_REFUND_AMOUNT'; end if;
    update public.payments set refunded_amount = greatest(refunded_amount,p_amount),
      status = case when greatest(refunded_amount,p_amount) = amount then 'refunded'::public.payment_status else 'partially_refunded'::public.payment_status end
      where order_id = p_order_id and provider = p_provider and provider_payment_id = p_provider_payment_id
      returning refunded_amount into v_refunded;
    if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
    update public.orders set payment_status = case when v_refunded = grand_total then 'refunded'::public.payment_status else 'partially_refunded'::public.payment_status end,
      order_status = case when v_refunded = grand_total then 'refunded'::public.order_status else order_status end where id = p_order_id;
    -- Refunds do not imply a physical return. Staff handle stock separately.
    return true;
  end if;
  if v_order.grand_total <> p_amount then raise exception 'PAYMENT_TOTAL_MISMATCH'; end if;
  if v_order.payment_status in ('paid','partially_refunded','refunded') then return false; end if;
  -- Ignore out-of-order pending events after a terminal failed/expired event.
  if p_outcome = 'pending' and v_order.payment_status in ('failed','cancelled') then return false; end if;
  insert into public.payments(order_id,provider,provider_payment_id,amount,currency,status)
    values(p_order_id,p_provider,p_provider_payment_id,p_amount,p_currency,
      case when p_outcome = 'pending' then 'processing'::public.payment_status else p_outcome::public.payment_status end)
    on conflict(provider,provider_payment_id) do update set status = excluded.status;
  if p_outcome = 'pending' then
    update public.orders set payment_status = 'processing' where id = p_order_id;
    update public.inventory_reservations set expires_at = greatest(expires_at,now() + interval '7 days')
      where order_id = p_order_id and released_at is null and consumed_at is null;
  else
    update public.orders set payment_status = p_outcome::public.payment_status, order_status = 'cancelled', fulfillment_status = 'cancelled' where id = p_order_id;
    update public.inventory_reservations set released_at = now()
      where order_id = p_order_id and released_at is null and consumed_at is null;
  end if;
  return true;
end;
$$;

create or replace function public.update_order_fulfillment(
  p_order_id uuid, p_order_status public.order_status, p_fulfillment_status public.fulfillment_status
) returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if p_order_status = 'refunded' and v_order.payment_status <> 'refunded' then raise exception 'REFUND_REQUIRED'; end if;
  if (p_order_status in ('paid','processing','shipped','completed') or p_fulfillment_status in ('processing','shipped','fulfilled'))
    and v_order.payment_status not in ('paid','partially_refunded') then raise exception 'PAYMENT_REQUIRED'; end if;
  if v_order.payment_status in ('paid','partially_refunded','refunded') and p_order_status = 'pending_payment' then raise exception 'INVALID_ORDER_TRANSITION'; end if;
  if p_order_status = 'cancelled' and v_order.payment_status in ('pending','processing') then
    -- Expire the Stripe session first. A status edit cannot stop a live payment.
    raise exception 'PAYMENT_CANCELLATION_REQUIRED';
  end if;
  update public.orders set order_status = p_order_status, fulfillment_status = p_fulfillment_status where id = p_order_id;
end;
$$;

-- Keep dashboard revenue accurate when a paid order is partially refunded.
create or replace function public.admin_dashboard_summary(p_since timestamptz)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'pending', (select count(*) from public.orders where order_status = 'pending_payment'),
    'low_stock', (select count(*) from public.product_variants where active and stock_quantity <= low_stock_threshold),
    'paid_count', (select count(*) from public.orders where payment_status in ('paid','partially_refunded') and created_at >= p_since),
    'revenue', coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'total',total) order by currency)
      from (select o.currency, sum(o.grand_total - coalesce(r.refunded,0)) as total
        from public.orders o left join lateral (
          select sum(p.refunded_amount) as refunded from public.payments p where p.order_id = o.id
        ) r on true where o.payment_status in ('paid','partially_refunded') and o.created_at >= p_since
        group by o.currency) totals), '[]'::jsonb)
  );
$$;

revoke all on function public.register_payment_session(uuid,text,text,timestamptz),
  public.create_checkout_order(uuid,text,text,text,text,jsonb,jsonb,uuid,jsonb,uuid),
  public.release_unpaid_order(uuid), public.apply_payment_event(uuid,text,text,text,text,numeric,char,text,text),
  public.update_order_fulfillment(uuid,public.order_status,public.fulfillment_status) from public, anon, authenticated;
grant execute on function public.register_payment_session(uuid,text,text,timestamptz),
  public.create_checkout_order(uuid,text,text,text,text,jsonb,jsonb,uuid,jsonb,uuid),
  public.release_unpaid_order(uuid), public.apply_payment_event(uuid,text,text,text,text,numeric,char,text,text),
  public.update_order_fulfillment(uuid,public.order_status,public.fulfillment_status) to service_role;
-- Explicitly retain the restricted grant on the replaced capture function.
revoke all on function public.finalize_paid_order(uuid,text,text,text,text,numeric,char,text,text) from public, anon, authenticated;
grant execute on function public.finalize_paid_order(uuid,text,text,text,text,numeric,char,text,text) to service_role;
revoke all on function public.admin_dashboard_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary(timestamptz) to service_role;
notify pgrst, 'reload schema';
commit;
