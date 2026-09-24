begin;

create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  locale text not null check (locale in ('de', 'en')),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived')),
  created_at timestamptz not null default now()
);

alter table public.contact_inquiries enable row level security;
revoke all on public.contact_inquiries from anon, authenticated;

update public.products set currency = 'CHF' where currency = 'EUR';
update public.product_variants set currency = 'CHF' where currency = 'EUR';
update public.shipping_rates set currency = 'CHF' where currency = 'EUR';

commit;
