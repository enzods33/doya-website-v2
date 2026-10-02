-- Hardening commerce : preuve CGV, zone de livraison figée, outbox e-mail et index.
-- Additif et compatible avec les commandes historiques.

alter table public.orders
  add column if not exists shipping_zone_id text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

alter table public.orders
  drop constraint if exists orders_terms_version_check;

alter table public.orders
  add constraint orders_terms_version_check
  check (
    terms_version is null
    or char_length(btrim(terms_version)) between 1 and 40
  );

alter table public.orders
  drop constraint if exists orders_terms_pair_check;

alter table public.orders
  add constraint orders_terms_pair_check
  check (
    (terms_accepted_at is null and terms_version is null)
    or (terms_accepted_at is not null and terms_version is not null)
  );

alter table public.orders
  drop constraint if exists orders_shipping_zone_fk;

alter table public.orders
  add constraint orders_shipping_zone_fk
  foreign key (shipping_zone_id)
  references public.shipping_zones(id)
  on update cascade
  on delete set null;

create table if not exists public.order_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('customer', 'merchant')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'failed', 'sent')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, kind)
);

alter table public.order_email_outbox enable row level security;
revoke all on table public.order_email_outbox from public, anon, authenticated;
grant all on table public.order_email_outbox to service_role;

create index if not exists order_email_outbox_due_idx
  on public.order_email_outbox (next_attempt_at)
  where status in ('pending', 'sending', 'failed');

create or replace function public.claim_due_order_emails(p_limit integer default 20)
returns setof public.order_email_outbox
language plpgsql
security definer
set search_path = public
as $
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  return query
  with due as (
    select id
    from public.order_email_outbox
    where (
      status in ('pending', 'failed')
      or (status = 'sending' and next_attempt_at <= now())
    )
      and next_attempt_at <= now()
    order by next_attempt_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 50))
  )
  update public.order_email_outbox o
  set status = 'sending',
      attempts = attempts + 1,
      next_attempt_at = now() + interval '10 minutes',
      updated_at = now()
  from due
  where o.id = due.id
  returning o.*;
end;
$;

revoke all on function public.claim_due_order_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_due_order_emails(integer) to service_role;

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
create index if not exists orders_promo_id_idx
  on public.orders (promo_id);
create index if not exists orders_user_id_idx
  on public.orders (user_id);
create index if not exists promo_redemptions_promo_id_idx
  on public.promo_redemptions (promo_id);
create index if not exists promo_redemptions_user_id_idx
  on public.promo_redemptions (user_id);
create index if not exists stock_reservations_variant_id_idx
  on public.stock_reservations (variant_id);

drop function if exists public.mark_order_paid_from_stripe(uuid, text, text, jsonb, integer, integer, text);

create function public.mark_order_paid_from_stripe(
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
    raise exception 'shipping_amount_mismatch';
  end if;

  if p_total_cents is null or p_total_cents is distinct from order_row.total_cents then
    raise exception 'total_amount_mismatch';
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
