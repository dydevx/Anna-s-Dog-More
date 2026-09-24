# Anna's Dog & More

Production-oriented bilingual commerce application for Anna's Dog & More in Zürich. The storefront is built with Next.js and TypeScript; Supabase supplies PostgreSQL, Auth, RLS, and product-image storage; payment is behind a provider interface with a Stripe implementation.

## Architecture

- `app/[locale]`: German (`/de`) and English (`/en`) storefront, shop, product, cart, checkout, account, and legal routes.
- `app/admin`: role-protected product, inventory, order, category, and shipping administration.
- `app/api`: server-side search, shipping lookup, checkout, and signed Stripe webhook endpoints.
- `components`: responsive UI and the persistent guest cart.
- `lib/payments`: provider-neutral payment contract and Stripe adapter.
- `database/migrations`: relational commerce schema, RLS, storage policy, inventory reservation, and idempotent payment finalization.
- `data/catalog.ts` and `scripts/import-laboni.ts`: normalized source-backed starter catalog and controlled importer.
- `PRODUCT.md` and `DESIGN.md`: product and visual-system decisions.

The browser never supplies authoritative prices. Checkout validates the current variant, price, stock, country, and shipping method in PostgreSQL. A pending order reserves stock for 30 minutes. Only a verified provider webhook marks it paid and consumes inventory. Duplicate provider events are ignored by a unique event key.

## Local setup

Requirements: Node.js 20.9+ and a Supabase project.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`; the root redirects to German. Without Supabase variables, the public catalog uses the source-backed fallback when `CATALOG_FALLBACK_ENABLED=true`. Checkout and admin correctly remain unavailable until their server configuration exists.

Quality commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Supabase

Run the SQL files in order through a controlled migration workflow:

1. `database/migrations/001_initial_commerce.sql`
2. `database/migrations/002_storage.sql`

Then load the verified starter catalog:

```bash
npm run import:catalog
```

The schema includes categories, products, relational product variants, product images and attributes, bundles, profiles, addresses, user roles, shipping zones/methods/rates, order snapshots, inventory reservations and movements, payments, webhook events, legal pages, and public store settings. Public RLS exposes only active catalog and configuration records; signed-in users can read only their own account and orders. All elevated writes use the server-only Supabase key.

### Create the first admin

1. Register the user through Supabase Auth or the storefront account form.
2. In the Supabase SQL editor, insert the authenticated user's UUID:

```sql
insert into public.user_roles (user_id, role)
values ('AUTH_USER_UUID', 'admin')
on conflict (user_id) do update set role = excluded.role;
```

3. Sign in at `/admin/login`. Never expose or embed the service/secret key in a browser bundle.

## Environment variables

Copy `.env.example`. Required for a live storefront:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`), server only
- `NEXT_PUBLIC_SITE_URL`, the exact public origin
- `PAYMENT_PROVIDER=stripe`
- `STRIPE_SECRET_KEY`, server only
- `STRIPE_WEBHOOK_SECRET`, server only

Optional Upstash-compatible `RATE_LIMIT_REDIS_URL` and `RATE_LIMIT_REDIS_TOKEN` make checkout throttling durable across serverless instances. For transactional mail, set `EMAIL_PROVIDER=resend`, `EMAIL_API_KEY`, a verified `ORDER_FROM_EMAIL`, and `SHOP_ORDER_EMAIL`. Paid-order customer and shop messages are bilingual and use provider idempotency keys; no delivery is claimed when the adapter is unconfigured.

## Shipping configuration

No shipping price is invented. In `/admin/shipping`, create a zone, add ISO country codes, a localized method, currency, fee, optional free-shipping threshold, and delivery estimate. Leave a rule inactive until the merchant approves it. Checkout stays unavailable for a country/currency with no active matching rule.

The storefront uses CHF as its single selling currency. The original numeric catalogue values are preserved without exchange-rate conversion, while currency is stored per variant and order and rendered with `Intl.NumberFormat`.

## Stripe sandbox and production

The Stripe adapter supports cards and offers TWINT for CHF orders. No card number or CVV reaches this application.

For local testing:

1. Put a Stripe test secret key in `.env.local`.
2. Forward Stripe test events to `http://localhost:3000/api/webhooks/stripe`.
3. Put the forwarding endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`.
4. Use Stripe's documented test payment details in hosted Checkout.
5. Verify the order stays `pending_payment` after the browser redirect and becomes `paid` only after the signed webhook.
6. Re-send the same event and confirm stock and payment events are not duplicated.

Before production, activate an eligible Swiss merchant account, enable the required payment methods, replace all test credentials with production secrets, register `https://YOUR_DOMAIN/api/webhooks/stripe`, and perform a real low-value end-to-end order/refund test.

## Content still requiring owner approval

- Official CHF prices, if CHF/TWINT checkout is desired.
- Shipping countries, fees, free-shipping thresholds, weight rules, and delivery estimates.
- Tax/VAT treatment and customer-facing tax wording.
- Lawyer-approved Impressum, Datenschutz, AGB, Versand, and detailed return/refund terms. Only the supplied 14-day return period is currently stated.
- Merchant payment credentials and the final payment provider/account.
- Transactional email account, verified sender domain, and shop notification address.
- Final inventory and any remaining LABONI catalog records not confirmed by the supplied sources.
- Authorized social-profile URLs.

## Deploy to Vercel

1. Push the project to a private Git repository and import it into Vercel.
2. Add production environment variables in Vercel; keep secret/service-role values server-only.
3. Apply reviewed Supabase migrations and run the catalog importer once against the intended project.
4. Configure active shipping rules and the first admin account.
5. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin and redeploy.
6. Register the production Stripe webhook and signing secret.
7. Add and verify the custom domain in Vercel, update DNS, and make it the primary domain.
8. Run the checkout/webhook/refund smoke test, test DE/EN canonical and hreflang URLs, and submit `/sitemap.xml` in the relevant search consoles.

Do not launch checkout until shipping, tax, legal, email, inventory, currency, and merchant-account decisions above are approved.
