-- Run this file in Supabase SQL Editor. It is additive and can be run again.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- The catalog reads active products newest first and one ordered image per product.
create index if not exists products_active_created_idx
  on public.products(created_at desc, id) where active;
create index if not exists products_active_category_created_idx
  on public.products(category_id, created_at desc, id) where active;
create index if not exists product_images_product_sort_idx
  on public.product_images(product_id, sort_order, id);

-- Bounded admin lists and the recent-order/revenue dashboard.
create index if not exists products_updated_idx
  on public.products(updated_at desc, id);
create index if not exists orders_created_idx
  on public.orders(created_at desc, id);
create index if not exists orders_paid_created_idx
  on public.orders(created_at desc) include (grand_total, currency)
  where payment_status = 'paid';

-- These foreign-key lookups previously had no leading-column indexes.
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists payments_order_idx on public.payments(order_id);
create index if not exists addresses_user_created_idx
  on public.addresses(user_id, created_at desc, id);

-- Aggregate in PostgreSQL instead of downloading every active variant and paid order.
create or replace function public.admin_dashboard_summary(p_since timestamptz)
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'pending', (select count(*) from public.orders where order_status = 'pending_payment'),
    'low_stock', (select count(*) from public.product_variants
      where active and stock_quantity <= low_stock_threshold),
    'paid_count', (select count(*) from public.orders
      where payment_status = 'paid' and created_at >= p_since),
    'revenue', coalesce((select jsonb_agg(jsonb_build_object('currency', currency, 'total', total)
        order by currency)
      from (select currency, sum(grand_total) as total from public.orders
        where payment_status = 'paid' and created_at >= p_since group by currency) totals), '[]'::jsonb)
  );
$$;
revoke all on function public.admin_dashboard_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary(timestamptz) to service_role;

analyze public.products;
analyze public.product_images;
analyze public.product_variants;
analyze public.orders;
analyze public.order_items;
analyze public.payments;
analyze public.addresses;
notify pgrst, 'reload schema';
commit;
