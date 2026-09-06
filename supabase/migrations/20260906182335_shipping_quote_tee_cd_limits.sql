-- Forfait port : max 6 tee-shirts et 5 CD. Au-delà → shipping_quote_required (pas de Stripe).

create or replace function public.create_pending_order(
  p_email text,
  p_user_id uuid,
  p_items jsonb,
  p_promo_code text,
  p_shipping_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row public.products;
  variant_row public.product_variants;
  promo_row public.promo_codes;
  v_order_id uuid;
  v_product_id text;
  v_size text;
  v_quantity integer;
  line_count integer := 0;
  total_qty integer := 0;
  tee_qty integer := 0;
  cd_qty integer := 0;
  subtotal integer := 0;
  discount integer := 0;
  shipping integer;
  normalized_email text;
  normalized_code text;
  lines jsonb := '[]'::jsonb;
  promo_requested boolean := false;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  normalized_email := lower(btrim(p_email));
  if normalized_email is null or normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  if p_shipping_cents is null or p_shipping_cents < 0 or p_shipping_cents > 50000 then
    raise exception 'invalid_shipping';
  end if;
  shipping := p_shipping_cents;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_cart';
  end if;
  if jsonb_array_length(p_items) > 8 then
    raise exception 'too_many_lines';
  end if;

  insert into public.orders (user_id, email, status, subtotal_cents, discount_cents, shipping_cents, total_cents)
  values (p_user_id, normalized_email, 'pending', 0, 0, shipping, shipping)
  returning id into v_order_id;

  for item in
    select value
    from jsonb_array_elements(p_items) as t(value)
    order by value ->> 'productId', value ->> 'size'
  loop
    v_product_id := item ->> 'productId';
    v_size := upper(item ->> 'size');
    v_quantity := (item ->> 'quantity')::integer;

    if v_product_id is null or v_product_id !~ '^[a-z0-9-]+$' then
      raise exception 'invalid_product';
    end if;
    if v_size not in ('XS', 'S', 'M', 'L', 'XL', 'U') then
      raise exception 'invalid_size';
    end if;
    if v_quantity is null or v_quantity < 1 or v_quantity > 6 then
      raise exception 'invalid_quantity';
    end if;

    line_count := line_count + 1;
    total_qty := total_qty + v_quantity;
    if total_qty > 12 then
      raise exception 'too_many_items';
    end if;

    select * into product_row from public.products where id = v_product_id for update;
    if not found or not product_row.on_sale or product_row.price_cents is null or product_row.price_cents <= 0 then
      raise exception 'product_unavailable';
    end if;

    select * into variant_row
    from public.product_variants
    where product_variants.product_id = v_product_id and product_variants.size = v_size
    for update;
    if not found or (variant_row.stock - variant_row.reserved) < v_quantity then
      raise exception 'out_of_stock';
    end if;

    update public.product_variants
    set reserved = reserved + v_quantity
    where id = variant_row.id;

    insert into public.stock_reservations (order_id, variant_id, quantity, status)
    values (v_order_id, variant_row.id, v_quantity, 'held');

    insert into public.order_items (order_id, product_id, size, quantity, unit_price_cents)
    values (v_order_id, product_row.id, v_size, v_quantity, product_row.price_cents);

    if product_row.type = 'T-shirt' then
      tee_qty := tee_qty + v_quantity;
    elsif product_row.type = 'CD' then
      cd_qty := cd_qty + v_quantity;
    end if;

    subtotal := subtotal + product_row.price_cents * v_quantity;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'productId', product_row.id,
      'name', product_row.name,
      'size', v_size,
      'quantity', v_quantity,
      'unitPriceCents', product_row.price_cents
    ));
  end loop;

  -- Forfait en ligne : ≤ 6 tees et ≤ 5 CD. Au-delà = devis (pas de session Stripe).
  if tee_qty > 6 or cd_qty > 5 then
    raise exception 'shipping_quote_required';
  end if;

  promo_requested := p_promo_code is not null and btrim(p_promo_code) <> '';

  if promo_requested then
    normalized_code := upper(regexp_replace(btrim(p_promo_code), '\s+', '', 'g'));

    select * into promo_row
    from public.promo_codes
    where code = normalized_code
    for update;

    if not found
      or not promo_row.active
      or (promo_row.starts_at is not null and promo_row.starts_at > now())
      or (promo_row.ends_at is not null and promo_row.ends_at < now())
      or subtotal < promo_row.min_subtotal_cents
      or (promo_row.max_redemptions is not null and promo_row.redeemed + promo_row.held >= promo_row.max_redemptions)
    then
      raise exception 'promo_invalid';
    end if;

    if promo_row.min_tee_qty > 0 and tee_qty < promo_row.min_tee_qty then
      raise exception 'promo_needs_tees';
    end if;

    if promo_row.one_per_customer and exists (
      select 1
      from public.promo_redemptions r
      where r.promo_id = promo_row.id and r.email = normalized_email
    ) then
      raise exception 'promo_already_used';
    end if;
  else
    select * into promo_row
    from public.promo_codes
    where id = (
      select p.id
      from public.promo_codes p
      where p.auto_apply = true
        and p.active = true
        and p.min_tee_qty > 0
        and tee_qty >= p.min_tee_qty
        and subtotal >= p.min_subtotal_cents
        and (p.starts_at is null or p.starts_at <= now())
        and (p.ends_at is null or p.ends_at >= now())
        and (p.max_redemptions is null or p.redeemed + p.held < p.max_redemptions)
        and (
          not p.one_per_customer
          or not exists (
            select 1
            from public.promo_redemptions r
            where r.promo_id = p.id and r.email = normalized_email
          )
        )
      order by p.min_tee_qty desc, coalesce(p.amount_off_cents, 0) desc
      limit 1
    )
    for update;
  end if;

  if promo_row.id is not null then
    if promo_row.percent_off is not null then
      discount := floor(subtotal * promo_row.percent_off / 100);
    else
      discount := least(promo_row.amount_off_cents, subtotal);
    end if;

    update public.promo_codes set held = held + 1 where id = promo_row.id;

    update public.orders
    set promo_id = promo_row.id, promo_code = promo_row.code
    where id = v_order_id;
  end if;

  update public.orders
  set subtotal_cents = subtotal,
      discount_cents = discount,
      total_cents = subtotal - discount + shipping
  where id = v_order_id;

  return jsonb_build_object(
    'orderId', v_order_id,
    'email', normalized_email,
    'subtotalCents', subtotal,
    'discountCents', discount,
    'shippingCents', shipping,
    'totalCents', subtotal - discount + shipping,
    'currency', 'eur',
    'promoCode', case when promo_row.id is null then null else promo_row.code end,
    'lines', lines
  );
end;
$$;

revoke all on function public.create_pending_order(text, uuid, jsonb, text, integer) from public, anon, authenticated;
grant execute on function public.create_pending_order(text, uuid, jsonb, text, integer) to service_role;
