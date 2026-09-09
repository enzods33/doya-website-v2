-- Libération auto des réservations pending > 35 min (aligné Stripe expires_at 30 min).
-- Avant : seulement au prochain create-checkout → holds pouvaient rester des jours.
-- pg_cron appelle en rôle postgres : autoriser ce rôle (en plus de service_role).

create or replace function public.release_reservation(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hold public.stock_reservations;
  order_row public.orders;
begin
  if coalesce(nullif(auth.role(), ''), current_user) not in ('service_role', 'postgres') then
    raise exception 'forbidden';
  end if;

  select * into order_row from public.orders where id = p_order_id for update;
  if not found then
    return;
  end if;

  for hold in
    select * from public.stock_reservations
    where order_id = p_order_id and status = 'held'
    for update
  loop
    update public.product_variants
    set reserved = reserved - hold.quantity
    where id = hold.variant_id;

    update public.stock_reservations
    set status = 'released'
    where id = hold.id;
  end loop;

  if order_row.promo_id is not null and order_row.status = 'pending' then
    update public.promo_codes
    set held = greatest(held - 1, 0)
    where id = order_row.promo_id;
  end if;

  if order_row.status = 'pending' then
    update public.orders set status = 'expired' where id = p_order_id;
  end if;
end;
$$;

create or replace function public.release_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  stale uuid;
  released integer := 0;
begin
  if coalesce(nullif(auth.role(), ''), current_user) not in ('service_role', 'postgres') then
    raise exception 'forbidden';
  end if;

  for stale in
    select id from public.orders
    where status = 'pending' and created_at < now() - interval '35 minutes'
  loop
    perform public.release_reservation(stale);
    released := released + 1;
  end loop;
  return released;
end;
$$;

revoke all on function public.release_reservation(uuid) from public, anon, authenticated;
revoke all on function public.release_stale_reservations() from public, anon, authenticated;
grant execute on function public.release_reservation(uuid) to service_role;
grant execute on function public.release_stale_reservations() to service_role;

create extension if not exists pg_cron with schema pg_catalog;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'release-stale-stock-reservations') then
    perform cron.unschedule('release-stale-stock-reservations');
  end if;
  perform cron.schedule(
    'release-stale-stock-reservations',
    '*/5 * * * *',
    $cron$select public.release_stale_reservations();$cron$
  );
exception
  when others then
    raise notice 'pg_cron schedule skipped: %', sqlerrm;
end;
$$;

select public.release_stale_reservations() as released_now;
