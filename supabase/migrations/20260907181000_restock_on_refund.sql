-- Restock stock on Stripe refund + allow reservation status 'refunded'.

alter table public.stock_reservations drop constraint if exists stock_reservations_status_check;
alter table public.stock_reservations
  add constraint stock_reservations_status_check
  check (status = any (array['held'::text, 'committed'::text, 'released'::text, 'refunded'::text]));

create or replace function public.restock_order_from_refund(p_payment_intent text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders;
  hold public.stock_reservations;
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

revoke all on function public.restock_order_from_refund(text) from public, anon, authenticated;
grant execute on function public.restock_order_from_refund(text) to service_role;
