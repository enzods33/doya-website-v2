-- Hardening commerce/newsletter post-audit 2026-10-02.
-- Additif et rétro-compatible : aucune commande existante n'est modifiée.

alter table public.orders
  add column if not exists shipping_zone_id text references public.shipping_zones(id) on update cascade on delete set null,
  add column if not exists shipping_zone_countries text[],
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

alter table public.orders
  drop constraint if exists orders_terms_pair_check,
  drop constraint if exists orders_shipping_snapshot_check;

alter table public.orders
  add constraint orders_terms_pair_check check (
    (terms_accepted_at is null and terms_version is null)
    or (terms_accepted_at is not null and char_length(btrim(terms_version)) between 1 and 40)
  ),
  add constraint orders_shipping_snapshot_check check (
    shipping_zone_countries is null or cardinality(shipping_zone_countries) > 0
  );

create table if not exists public.order_email_deliveries (
  order_id uuid primary key references public.orders(id) on delete cascade,
  customer_sent_at timestamptz,
  merchant_sent_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.order_email_deliveries enable row level security;
revoke all on table public.order_email_deliveries from public, anon, authenticated;
grant all on table public.order_email_deliveries to service_role;

create table if not exists public.newsletter_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'fr',
  source text not null default 'footer',
  consent_version text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'unsubscribed')),
  token_hash text unique,
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint newsletter_consents_email_check check (email ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'),
  constraint newsletter_consents_locale_check check (locale in ('fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar')),
  constraint newsletter_consents_source_check check (source in ('footer', 'menu', 'cart', 'quote'))
);

alter table public.newsletter_consents enable row level security;
revoke all on table public.newsletter_consents from public, anon, authenticated;
grant all on table public.newsletter_consents to service_role;

create table if not exists public.newsletter_signing_keys (
  id text primary key,
  secret text not null,
  created_at timestamptz not null default now()
);

alter table public.newsletter_signing_keys enable row level security;
revoke all on table public.newsletter_signing_keys from public, anon, authenticated;
grant all on table public.newsletter_signing_keys to service_role;

insert into public.newsletter_signing_keys (id, secret)
values ('unsubscribe-v1', encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists orders_promo_id_idx on public.orders(promo_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_shipping_zone_id_idx on public.orders(shipping_zone_id);
create index if not exists promo_redemptions_promo_id_idx on public.promo_redemptions(promo_id);
create index if not exists promo_redemptions_user_id_idx on public.promo_redemptions(user_id);
create index if not exists stock_reservations_variant_id_idx on public.stock_reservations(variant_id);
create index if not exists newsletter_consents_email_requested_idx
  on public.newsletter_consents(lower(email), requested_at desc);
create index if not exists newsletter_consents_pending_idx
  on public.newsletter_consents(expires_at)
  where status = 'pending';

create or replace function public.mark_order_paid_from_stripe(
  p_order_id uuid,
  p_payment_intent text,
  p_shipping_name text,
  p_shipping_address jsonb,
  p_shipping_cents integer default null,
  p_total_cents integer default null,
  p_shipping_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_missing';
  end if;

  if order_row.status = 'paid' then
    return;
  end if;

  if order_row.status is distinct from 'pending' then
    raise exception 'order_not_pending';
  end if;

  if p_shipping_cents is null or p_shipping_cents is distinct from order_row.shipping_cents then
    raise exception 'unexpected_shipping_amount';
  end if;

  if p_total_cents is null or p_total_cents is distinct from order_row.total_cents then
    raise exception 'unexpected_total_amount';
  end if;

  if p_shipping_phone is not null and char_length(trim(p_shipping_phone)) > 40 then
    raise exception 'invalid_phone';
  end if;

  update public.orders
  set stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
      shipping_name = coalesce(p_shipping_name, shipping_name),
      shipping_address = coalesce(p_shipping_address, shipping_address),
      shipping_phone = coalesce(nullif(trim(p_shipping_phone), ''), shipping_phone)
  where id = p_order_id;

  perform public.commit_reservation(p_order_id);
end;
$$;

revoke all on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb, integer, integer, text)
  to service_role;
