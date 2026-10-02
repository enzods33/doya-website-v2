-- Double opt-in newsletter DOYA.
-- Brevo reste la source principale des abonnÃ©s. Supabase ne conserve qu'une
-- preuve de consentement et, temporairement, l'adresse nÃ©cessaire au welcome.

create table if not exists public.newsletter_optins (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null unique,
  pending_email text,
  token_hash text not null unique,
  source text not null check (source in ('footer', 'menu', 'cart')),
  locale text not null default 'fr'
    check (locale in ('fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar')),
  consent_version text not null,
  consent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  welcome_sent_at timestamptz,
  unsubscribed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_optins_email_hash_check
    check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint newsletter_optins_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint newsletter_optins_pending_email_check
    check (pending_email is null or char_length(pending_email) between 3 and 320)
);

alter table public.newsletter_optins enable row level security;
revoke all on table public.newsletter_optins from public, anon, authenticated;
grant all on table public.newsletter_optins to service_role;

create index if not exists newsletter_optins_expires_idx
  on public.newsletter_optins (expires_at)
  where confirmed_at is null;

-- Le FK ajoutÃ© par le hardening commerce doit avoir son index couvrant.
create index if not exists orders_shipping_zone_id_idx
  on public.orders (shipping_zone_id);
-- Index FK recommandÃ© par l'advisor Supabase.
create index if not exists orders_shipping_zone_id_idx
  on public.orders (shipping_zone_id);
-- Fige le pays choisi au moment de crÃ©er la session Stripe.
alter table public.orders
  add column if not exists shipping_country text;

alter table public.orders
  drop constraint if exists orders_shipping_country_check;

alter table public.orders
  add constraint orders_shipping_country_check
  check (
    shipping_country is null
    or shipping_country ~ '^[A-Z]{2}$'
  );
-- Ã‰tend l'outbox transactionnelle au mail d'expÃ©dition.
alter table public.order_email_outbox
  drop constraint if exists order_email_outbox_kind_check;

alter table public.order_email_outbox
  add constraint order_email_outbox_kind_check
  check (kind in ('paid_confirmation', 'shipped_notification'));

alter table public.order_email_outbox
  add column if not exists delivery_key uuid not null default gen_random_uuid();

create unique index if not exists order_email_outbox_delivery_key_idx
  on public.order_email_outbox (delivery_key);
-- Journal newsletter : empÃªche les doublons de trace lors d'un retry API.
alter table public.newsletter_messages
  add column if not exists idempotency_key uuid;

create unique index if not exists newsletter_messages_idempotency_key_idx
  on public.newsletter_messages (idempotency_key)
  where idempotency_key is not null;
