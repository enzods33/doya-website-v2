-- Sync shipping + total from Stripe when the customer picks a zone rate at Checkout.

drop function if exists public.mark_order_paid_from_stripe(uuid, text, text, jsonb);

create function public.mark_order_paid_from_stripe(
  p_order_id uuid,
  p_payment_intent text,
  p_shipping_name text,
  p_shipping_address jsonb,
  p_shipping_cents integer default null,
  p_total_cents integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_shipping_cents is not null and (p_shipping_cents < 0 or p_shipping_cents > 50000) then
    raise exception 'invalid_shipping';
  end if;

  if p_total_cents is not null and p_total_cents < 0 then
    raise exception 'invalid_total';
  end if;

  update public.orders
  set stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
      shipping_name = coalesce(p_shipping_name, shipping_name),
      shipping_address = coalesce(p_shipping_address, shipping_address),
      shipping_cents = coalesce(p_shipping_cents, shipping_cents),
      total_cents = coalesce(
        p_total_cents,
        case
          when p_shipping_cents is not null then subtotal_cents - discount_cents + p_shipping_cents
          else total_cents
        end
      )
  where id = p_order_id;

  perform public.commit_reservation(p_order_id);
end;
$$;

revoke all on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb, integer, integer) from public, anon, authenticated;
grant execute on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb, integer, integer) to service_role;

