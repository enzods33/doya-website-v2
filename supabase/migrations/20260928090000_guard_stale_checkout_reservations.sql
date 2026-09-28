-- Une session Stripe encore ouverte peut être payée. Le cron ne libère que les
-- réservations qui n'ont jamais été associées à une session de paiement.
-- Pour les autres, l'événement checkout.session.expired libère le stock.
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
    where status = 'pending'
      and stripe_checkout_session_id is null
      and created_at < now() - interval '35 minutes'
  loop
    perform public.release_reservation(stale);
    released := released + 1;
  end loop;
  return released;
end;
$$;

revoke all on function public.release_stale_reservations() from public, anon, authenticated;
grant execute on function public.release_stale_reservations() to service_role;
