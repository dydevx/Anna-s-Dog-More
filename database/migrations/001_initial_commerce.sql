begin;

create extension if not exists pgcrypto;

create type public.product_type as enum ('simple', 'configurable', 'bundle');
create type public.order_status as enum ('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded');
create type public.fulfillment_status as enum ('unfulfilled', 'processing', 'shipped', 'fulfilled', 'cancelled');
create type public.inventory_movement_type as enum ('receipt', 'adjustment', 'sale', 'return', 'reservation_release');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_de text not null,
  name_en text not null,
  description_de text,
  description_en text,
  image_url text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_de text not null,
  name_en text not null,
  description_de text,
  description_en text,
  short_description_de text,
  short_description_en text,
  product_type public.product_type not null default 'simple',
  base_price numeric(12,2) not null check (base_price >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  source_url text,
  active boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  article_number text not null,
  price numeric(12,2) check (price is null or price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  visible boolean not null default true,
  active boolean not null default false,
  size text,
  color text,
  material text,
  fabric text,
  mattress_type text,
  configuration text,
  capacity text,
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, article_number)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  url text not null,
  alt_de text not null,
  alt_en text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_attributes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  attribute_name text not null,
  value_de text not null,
  value_en text not null,
  sort_order integer not null default 0,
  unique(product_id, attribute_name)
);

create table public.set_items (
  id uuid primary key default gen_random_uuid(),
  set_product_id uuid not null references public.products(id) on delete cascade,
  child_product_id uuid references public.products(id),
  child_variant_id uuid references public.product_variants(id),
  child_sku text not null,
  quantity integer not null check (quantity > 0),
  unique(set_product_id, child_sku)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  locale text not null default 'de' check (locale in ('de', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  first_name text not null,
  last_name text not null,
  street text not null,
  house_number text not null,
  postal_code text not null,
  city text not null,
  country_code char(2) not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('customer', 'admin')) default 'customer',
  created_at timestamptz not null default now()
);

create table public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_codes char(2)[] not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_methods (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references public.shipping_zones(id) on delete cascade,
  name_de text not null,
  name_en text not null,
  estimated_delivery_de text,
  estimated_delivery_en text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  method_id uuid not null references public.shipping_methods(id) on delete cascade,
  currency char(3) not null,
  fee numeric(12,2) not null check (fee >= 0),
  free_shipping_threshold numeric(12,2) check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  min_weight_grams integer,
  max_weight_grams integer,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  public_token uuid not null default gen_random_uuid() unique,
  customer_id uuid references auth.users(id) on delete set null,
  locale text not null check (locale in ('de', 'en')),
  email text not null,
  phone text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  discount_total numeric(12,2) not null default 0 check (discount_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  grand_total numeric(12,2) not null check (grand_total >= 0),
  currency char(3) not null,
  payment_status public.payment_status not null default 'pending',
  fulfillment_status public.fulfillment_status not null default 'unfulfilled',
  order_status public.order_status not null default 'pending_payment',
  shipping_method_id uuid references public.shipping_methods(id),
  shipping_address jsonb not null,
  billing_address jsonb not null,
  paid_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text not null,
  product_name text not null,
  variant_description text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null,
  released_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, variant_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  type public.inventory_movement_type not null,
  quantity integer not null,
  reference text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text not null,
  method text,
  amount numeric(12,2) not null,
  currency char(3) not null,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_payment_id)
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_hash text,
  processed_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table public.legal_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_de text not null,
  title_en text not null,
  content_de text,
  content_en text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create index categories_parent_idx on public.categories(parent_id, sort_order) where active;
create index products_category_idx on public.products(category_id, active);
create index products_featured_idx on public.products(featured, created_at desc) where active;
create index variants_product_idx on public.product_variants(product_id, active);
create index variants_article_idx on public.product_variants(article_number);
create unique index product_images_product_url_idx on public.product_images(product_id, url);
create index orders_customer_idx on public.orders(customer_id, created_at desc);
create index orders_status_idx on public.orders(order_status, created_at desc);
create index reservations_variant_idx on public.inventory_reservations(variant_id, expires_at) where released_at is null and consumed_at is null;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['categories','products','product_variants','profiles','addresses','shipping_zones','shipping_methods','orders','payments']
  loop
    execute format('create trigger %I_touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.next_order_number()
returns text language sql volatile set search_path = '' as $$
  select 'AD-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
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

  for v_item in select value from jsonb_array_elements(p_items)
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

  select * into v_rate from public.shipping_rates
  where method_id = p_shipping_method_id and currency = v_currency and active
  order by min_weight_grams nulls first limit 1;
  if not found then raise exception 'SHIPPING_UNAVAILABLE'; end if;
  v_shipping := case when v_rate.free_shipping_threshold is not null and v_subtotal >= v_rate.free_shipping_threshold then 0 else v_rate.fee end;

  insert into public.orders(id, order_number, customer_id, locale, email, phone, subtotal, shipping_total, grand_total, currency, shipping_method_id, shipping_address, billing_address)
  values(v_order_id, v_order_number, p_customer_id, p_locale, lower(trim(p_email)), p_phone, v_subtotal, v_shipping, v_subtotal + v_shipping, v_currency, p_shipping_method_id, p_shipping_address, p_billing_address);

  for v_item in select value from jsonb_array_elements(p_items)
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
    values(v_order_id, v_variant.id, v_quantity, now() + interval '30 minutes');
  end loop;

  return query select v_order_id, v_order_number, (select o.public_token from public.orders o where o.id = v_order_id), v_subtotal + v_shipping, v_currency;
end;
$$;

create or replace function public.finalize_paid_order(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_provider_event_id text,
  p_method text,
  p_amount numeric,
  p_currency char(3),
  p_event_type text,
  p_payload_hash text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_order public.orders%rowtype; v_reservation public.inventory_reservations%rowtype;
begin
  insert into public.payment_events(provider, provider_event_id, event_type, payload_hash)
  values(p_provider, p_provider_event_id, p_event_type, p_payload_hash)
  on conflict(provider, provider_event_id) do nothing;
  if not found then return false; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.grand_total <> p_amount or v_order.currency <> p_currency then raise exception 'PAYMENT_TOTAL_MISMATCH'; end if;

  insert into public.payments(order_id, provider, provider_payment_id, method, amount, currency, status)
  values(p_order_id, p_provider, p_provider_payment_id, p_method, p_amount, p_currency, 'paid')
  on conflict(provider, provider_payment_id) do update set status = 'paid', method = excluded.method, updated_at = now();

  if v_order.payment_status <> 'paid' then
    for v_reservation in select * from public.inventory_reservations where order_id = p_order_id and released_at is null and consumed_at is null for update
    loop
      update public.product_variants set stock_quantity = stock_quantity - v_reservation.quantity where id = v_reservation.variant_id and stock_quantity >= v_reservation.quantity;
      if not found then raise exception 'OUT_OF_STOCK_DURING_CAPTURE'; end if;
      update public.inventory_reservations set consumed_at = now() where id = v_reservation.id;
      insert into public.inventory_movements(variant_id, type, quantity, reference, order_id) values(v_reservation.variant_id, 'sale', -v_reservation.quantity, p_provider_payment_id, p_order_id);
    end loop;
    update public.orders set payment_status = 'paid', order_status = 'paid', paid_at = now() where id = p_order_id;
  end if;
  return true;
end;
$$;

revoke all on function public.create_pending_order(text,text,text,jsonb,jsonb,uuid,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.finalize_paid_order(uuid,text,text,text,text,numeric,char,text,text) from public, anon, authenticated;
grant execute on function public.create_pending_order(text,text,text,jsonb,jsonb,uuid,jsonb,uuid) to service_role;
grant execute on function public.finalize_paid_order(uuid,text,text,text,text,numeric,char,text,text) to service_role;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_attributes enable row level security;
alter table public.set_items enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.user_roles enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_reservations enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.legal_pages enable row level security;
alter table public.store_settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.products, public.product_variants, public.product_images, public.product_attributes, public.set_items to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.addresses to authenticated;
grant select on public.orders, public.order_items, public.payments, public.user_roles to authenticated;
grant select on public.shipping_zones, public.shipping_methods, public.shipping_rates, public.legal_pages, public.store_settings to anon, authenticated;

create policy "public reads active categories" on public.categories for select to anon, authenticated using (active);
create policy "public reads active products" on public.products for select to anon, authenticated using (active);
create policy "public reads visible variants" on public.product_variants for select to anon, authenticated using (visible and exists(select 1 from public.products p where p.id = product_id and p.active));
create policy "public reads product images" on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and p.active));
create policy "public reads product attributes" on public.product_attributes for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and p.active));
create policy "public reads bundle items" on public.set_items for select to anon, authenticated using (exists(select 1 from public.products p where p.id = set_product_id and p.active));
create policy "users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "users manage own addresses select" on public.addresses for select to authenticated using ((select auth.uid()) = user_id);
create policy "users manage own addresses insert" on public.addresses for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users manage own addresses update" on public.addresses for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users manage own addresses delete" on public.addresses for delete to authenticated using ((select auth.uid()) = user_id);
create policy "users read own role" on public.user_roles for select to authenticated using ((select auth.uid()) = user_id);
create policy "public reads active shipping zones" on public.shipping_zones for select to anon, authenticated using (active);
create policy "public reads active shipping methods" on public.shipping_methods for select to anon, authenticated using (active);
create policy "public reads active shipping rates" on public.shipping_rates for select to anon, authenticated using (active);
create policy "users read own orders" on public.orders for select to authenticated using ((select auth.uid()) = customer_id);
create policy "users read own order items" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy "users read own payments" on public.payments for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy "public reads published legal" on public.legal_pages for select to anon, authenticated using (status = 'published');
create policy "public reads public settings" on public.store_settings for select to anon, authenticated using (is_public);

commit;
