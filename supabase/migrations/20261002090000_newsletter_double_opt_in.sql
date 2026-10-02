-- Double opt-in newsletter DOYA.
-- Brevo reste la source principale des abonnés. Supabase ne conserve qu'une
-- preuve de consentement et, temporairement, l'adresse nécessaire au welcome.

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

-- Le FK ajouté par le hardening commerce doit avoir son index couvrant.
create index if not exists orders_shipping_zone_id_idx
  on public.orders (shipping_zone_id);
