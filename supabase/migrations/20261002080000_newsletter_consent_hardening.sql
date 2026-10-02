-- Hardening newsletter post-audit 2026-10-02.
-- Double opt-in, preuve de consentement et tokens de désabonnement opaques.

create table if not exists public.newsletter_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  locale text not null default 'fr',
  source text not null default 'footer',
  consent_version text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'unsubscribed')),
  confirmation_token_hash text unique,
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  constraint newsletter_consents_email_check
    check (email ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'),
  constraint newsletter_consents_locale_check
    check (locale in ('fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar')),
  constraint newsletter_consents_source_check
    check (source in ('footer', 'menu', 'cart', 'quote'))
);

alter table public.newsletter_consents enable row level security;
revoke all on table public.newsletter_consents from public, anon, authenticated;
grant all on table public.newsletter_consents to service_role;

create table if not exists public.newsletter_unsubscribe_tokens (
  token_hash text primary key,
  email text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.newsletter_unsubscribe_tokens enable row level security;
revoke all on table public.newsletter_unsubscribe_tokens from public, anon, authenticated;
grant all on table public.newsletter_unsubscribe_tokens to service_role;

create index if not exists newsletter_consents_email_requested_idx
  on public.newsletter_consents (lower(email), requested_at desc);

create index if not exists newsletter_consents_pending_idx
  on public.newsletter_consents (expires_at)
  where status = 'pending';

create index if not exists newsletter_unsubscribe_tokens_email_idx
  on public.newsletter_unsubscribe_tokens (lower(email));

-- Nettoyage léger des confirmations expirées ; aucune donnée confirmée n'est supprimée.
create or replace function public.prune_expired_newsletter_consents()
returns integer
language plpgsql
security definer
set search_path = public
as $newsletter_prune$
declare
  removed integer;
begin
  if coalesce(nullif(auth.role(), ''), current_user) not in ('service_role', 'postgres') then
    raise exception 'forbidden';
  end if;

  delete from public.newsletter_consents
  where status = 'pending'
    and expires_at is not null
    and expires_at < now() - interval '7 days';

  get diagnostics removed = row_count;
  return removed;
end;
$newsletter_prune$;

revoke all on function public.prune_expired_newsletter_consents()
  from public, anon, authenticated;
grant execute on function public.prune_expired_newsletter_consents()
  to service_role;

do $newsletter_cron$
begin
  if exists (select 1 from cron.job where jobname = 'prune-expired-newsletter-consents') then
    perform cron.unschedule('prune-expired-newsletter-consents');
  end if;

  perform cron.schedule(
    'prune-expired-newsletter-consents',
    '17 3 * * *',
    $cron$select public.prune_expired_newsletter_consents();$cron$
  );
exception
  when others then
    raise notice 'newsletter consent cron schedule skipped: %', sqlerrm;
end;
$newsletter_cron$;
