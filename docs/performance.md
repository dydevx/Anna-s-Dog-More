# Performance changes (2026-10-09)

## Measurements

Measured the old and updated production builds on the same Windows machine,
using the configured Supabase project and three sequential HTTP requests per URL.
Times below are medians for receiving the complete response; payloads are
uncompressed HTML/RSC or JSON, excluding images and JavaScript assets.

| Route | Response bytes before → after | Median total before → after |
| --- | ---: | ---: |
| `/de` | 64,332 → 62,281 | 321 → 118 ms |
| `/de/shop` | 1,665,311 → 265,524 (84% smaller) | 373 → 136 ms |
| `/de/shop/polsterbetten` | 1,346,442 → 266,765 (80% smaller) | 337 → 128 ms |
| `/de/product/classic-hundebett-bellagio` | 83,245 → 83,225 | 328 → 57 ms |
| `/api/search?q=emma` | 4,870 → 665 (86% smaller) | 360 → 18 ms |

These are local HTTP measurements, not browser rendering, Core Web Vitals, or a
guarantee of production timings. Cold requests still need database/network work:
the updated first product-detail request took 420 ms; its next two took 57/47 ms.
The public summary query returned 221,614 bytes versus 1,542,232 bytes for the
original full joined catalog (191 products), before applying any new SQL indexes.

## Application behavior

- Public catalog reads use Next.js's shared data cache for 60 seconds. Home and
  category overview pages use incremental static regeneration.
- Listings send one ordered image and compact filter/availability information per
  product. Product details still load all images and variants, querying only the
  requested slug. Search still includes descriptions, SKUs and article numbers.
- Listings initially render 24 cards; “Show more products” adds 24. Filters and
  sorting apply to the entire supplied catalog, including cards not yet shown.
- Product/order administration queries 50 rows per page, plus one next-page
  sentinel. Admin user and role verification are deduplicated within a render.
- Successful catalog/stock/image edits and paid-order finalization invalidate the
  public cache. Changes made directly in Supabase or by import scripts rely on
  the 60-second revalidation interval and the next request to refresh; this is
  not a strict freshness deadline. Checkout continues to validate authoritative
  prices and inventory in PostgreSQL. Authentication, private orders and checkout
  responses are not put in the shared catalog cache.

## Apply the database changes

For an existing database with migrations 001–004, open Supabase → SQL Editor,
paste the complete contents of `database/migrations/005_performance.sql`, then
click **Run**. Apply this before deploying the updated application if possible.
Do not re-run the initial schema migration on an existing database.

Run as the table-owner role (normally `postgres` for tables created in Supabase's
SQL Editor). This migration explicitly uses `SET LOCAL ROLE postgres` within its
transaction and checks ownership of `public.products` before creating indexes.
It does not change table ownership, role grants or RLS policies. PostgreSQL will
refuse the role switch if the session is not allowed to use `postgres`.

A service-role API key bypasses RLS but does not grant table ownership for index
creation. If SQLSTATE `42501` says "must be owner of table products", run this in
a new query to inspect the actual execution role and table owners:

```sql
select current_user as running_role, session_user as login_role,
       tablename, tableowner as owner_role
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in ('products', 'product_images', 'product_variants',
                   'orders', 'order_items', 'payments', 'addresses')
order by tablename;
```

Do not put `ROLLBACK` before the diagnostic SELECT in the same query: it can
reset a transaction-local role and make the reported identity differ from the
role that ran the failing statement. If an aborted transaction needs clearing,
run `ROLLBACK` alone first, then run the diagnostic as a separate query.

If the editor is using `anon`, `authenticated` or `service_role`, select `postgres`
and retry the entire migration when the tables belong to `postgres`. If the role
is already `postgres` but ownership differs, investigate the owning role before
changing permissions. Do not change table ownership or disable RLS to bypass
this error without reviewing the actual ownership results. If both match but
the revised migration still fails, capture the complete error including its
DETAIL/CONTEXT, and inspect database event triggers before retrying.

The file adds indexes for catalog/image ordering, bounded admin lists, paid-order
totals and foreign-key lookups. It also adds `admin_dashboard_summary`, an
aggregate available only to `service_role`, then refreshes table statistics and
the PostgREST schema cache. It is transactional, additive and rerunnable; it does
not modify products, orders or inventory records. Index creation uses standard
PostgreSQL locking, bounded by a 5-second lock timeout and 60-second statement
timeout. If a timeout occurs, the transaction rolls back; retry during a quiet
period. No changes have been applied to the live database by this coding session.

After a successful run, check the dashboard aggregate in SQL Editor with an
explicit transaction-local role. A standalone SELECT can still run under the
editor's selected restricted role after the migration commits:

```sql
begin;
set local role postgres;
select public.admin_dashboard_summary(current_date::timestamptz);
commit;
```

Run the complete block. A permission error from a standalone SELECT does not
establish that the migration failed; `anon` and `authenticated` are intentionally
denied execution. Keep those restrictions in place.

It should return `pending`, `low_stock`, `paid_count` and `revenue`. The query above
uses the database session's date boundary; the application passes its own start
timestamp. Check the Index Advisor/Query Performance report against actual traffic
before adding further indexes. Until this SQL is applied, the application falls
back to its prior dashboard queries.

## Verification and remaining validation

`npm test`, `npm run lint` and `npm run build` passed. Tests cover compact listing
queries, full product details, search, facets/stock, pagination input and dashboard
aggregation/fallback/error handling. Production HTTP checks cover DE/EN pages,
search, sitemap and unauthenticated admin access.

The user reported applying the migration successfully on 2026-10-09. A subsequent
live RPC call using the application's configured server key succeeded and returned
the expected summary fields and types. The new indexes have not been independently
inspected or benchmarked in PostgreSQL. A browser was unavailable in this session, so
interactive filters, the load-more button and authenticated admin pagination
still need browser smoke testing after deployment. Re-measure the deployed site
inside the Webcake iframe and directly on Vercel; the outer Webcake page also
contributes to perceived load time.
