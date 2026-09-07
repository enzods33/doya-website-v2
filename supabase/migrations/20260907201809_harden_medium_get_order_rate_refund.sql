-- Rate-limit partagé (toutes les Edge isolates) + restock refund uniquement si total.

create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  hit_count integer not null default 0 check (hit_count >= 0),
  window_start timestamptz not null default timezone('utc', now())
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated, public;
grant all on public.api_rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_key text := left(coalesce(nullif(trim(p_key), ''), 'unknown'), 200);
  max_hits integer := greatest(coalesce(p_max, 1), 1);
  win_secs integer := greatest(coalesce(p_window_seconds, 60), 1);
  row_rec public.api_rate_limits;
  now_ts timestamptz := timezone('utc', now());
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  insert into public.api_rate_limits (bucket_key, hit_count, window_start)
  values (clean_key, 0, now_ts)
  on conflict (bucket_key) do nothing;

  select * into row_rec
  from public.api_rate_limits
  where bucket_key = clean_key
  for update;

  if row_rec.window_start + make_interval(secs => win_secs) <= now_ts then
    update public.api_rate_limits
    set hit_count = 1, window_start = now_ts
    where bucket_key = clean_key;
    return true;
  end if;

  if row_rec.hit_count >= max_hits then
    return false;
  end if;

  update public.api_rate_limits
  set hit_count = hit_count + 1
  where bucket_key = clean_key;
  return true;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

drop function if exists public.restock_order_from_refund(text);

create function public.restock_order_from_refund(
  p_payment_intent text,
  p_amount_refunded integer default null,
  p_charge_amount integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders;
  hold public.stock_reservations;
  refunded integer := coalesce(p_amount_refunded, 0);
  charged integer := coalesce(p_charge_amount, 0);
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_payment_intent is null or btrim(p_payment_intent) = '' then
    return;
  end if;

  select * into order_row
  from public.orders
  where stripe_payment_intent_id = p_payment_intent
  for update;

  if not found then
    return;
  end if;

  if order_row.status = 'refunded' then
    return;
  end if;

  -- Refund partiel : ne pas restocker ni marquer refunded.
  if charged > 0 and refunded < charged then
    return;
  end if;
  if charged <= 0 and order_row.total_cents > 0 and refunded > 0 and refunded < order_row.total_cents then
    return;
  end if;

  if order_row.status = 'paid' then
    for hold in
      select *
      from public.stock_reservations
      where order_id = order_row.id and status = 'committed'
      for update
    loop
      update public.product_variants
      set stock = stock + hold.quantity
      where id = hold.variant_id;

      update public.stock_reservations
      set status = 'refunded'
      where id = hold.id;
    end loop;
  end if;

  update public.orders
  set status = 'refunded'
  where id = order_row.id;
end;
$$;

revoke all on function public.restock_order_from_refund(text, integer, integer) from public, anon, authenticated;
grant execute on function public.restock_order_from_refund(text, integer, integer) to service_role;
