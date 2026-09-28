-- Variantes libres par article : libellé administrable, visibilité et ordre.
-- La colonne size reste la clé technique stable pour compatibilité panier/commandes.

alter table public.product_variants
  drop constraint if exists product_variants_size_check;

alter table public.product_variants
  add column if not exists label text,
  add column if not exists active boolean not null default true,
  add column if not exists sort_order integer not null default 100;

update public.product_variants
set label = case size
  when '3/4' then '3–4 ans'
  when '5/6' then '5–6 ans'
  when '7/8' then '7–8 ans'
  when '9/11' then '9–11 ans'
  when '12/13' then '12–13 ans'
  when 'U' then 'Taille unique'
  else size
end
where label is null or btrim(label) = '';

alter table public.product_variants
  alter column label set not null;

alter table public.order_items
  add column if not exists variant_label text;

update public.order_items oi
set variant_label = coalesce(pv.label, oi.size)
from public.product_variants pv
where pv.product_id = oi.product_id
  and pv.size = oi.size
  and (oi.variant_label is null or btrim(oi.variant_label) = '');

update public.order_items
set variant_label = size
where variant_label is null or btrim(variant_label) = '';

alter table public.order_items
  alter column variant_label set not null;

alter table public.order_items
  drop constraint if exists order_items_variant_label_check;

alter table public.order_items
  add constraint order_items_variant_label_check
    check (char_length(btrim(variant_label)) between 1 and 80);

alter table public.product_variants
  drop constraint if exists product_variants_key_check,
  drop constraint if exists product_variants_label_check,
  drop constraint if exists product_variants_sort_order_check;

alter table public.product_variants
  add constraint product_variants_key_check
    check (char_length(btrim(size)) between 1 and 80),
  add constraint product_variants_label_check
    check (char_length(btrim(label)) between 1 and 80),
  add constraint product_variants_sort_order_check
    check (sort_order >= 0);

update public.product_variants
set sort_order = case size
  when 'ENF' then 5 when 'XS' then 10 when 'S' then 20 when 'M' then 30
  when 'L' then 40 when 'XL' then 50 when '3/4' then 10 when '5/6' then 20
  when '7/8' then 30 when '9/11' then 40 when '12/13' then 50
  when 'CD' then 10 when 'VINYL' then 20 when 'U' then 10
  else sort_order
end;

create or replace view public.catalog_variants
with (security_invoker = false) as
select
  v.id,
  v.product_id,
  v.size,
  greatest(v.stock - v.reserved, 0)::integer as available,
  v.label,
  v.sort_order
from public.product_variants v
join public.products p on p.id = v.product_id
where p.on_sale = true
  and p.price_cents is not null
  and p.price_cents > 0
  and v.active = true;

revoke all on table public.catalog_variants from anon, authenticated, public;
grant select on table public.catalog_variants to anon, authenticated;

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
  v_order_number text;
  v_product_id text;
  v_size text;
  v_quantity integer;
  line_count integer := 0;
  total_qty integer := 0;
  tee_qty integer := 0;
  cd_qty integer := 0;
  accessory_qty integer := 0;
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

  v_order_number := public.next_order_number();

  insert into public.orders (user_id, email, status, subtotal_cents, discount_cents, shipping_cents, total_cents, order_number)
  values (p_user_id, normalized_email, 'pending', 0, 0, shipping, shipping, v_order_number)
  returning id into v_order_id;

  for item in
    select value
    from jsonb_array_elements(p_items) as t(value)
    order by value ->> 'productId', value ->> 'size'
  loop
    v_product_id := item ->> 'productId';
    v_size := btrim(item ->> 'size');
    v_quantity := (item ->> 'quantity')::integer;

    if v_product_id is null or v_product_id !~ '^[a-z0-9-]+$' then
      raise exception 'invalid_product';
    end if;
    if v_size is null or char_length(v_size) < 1 or char_length(v_size) > 80 then
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
    where product_variants.product_id = v_product_id
      and product_variants.size = v_size
      and product_variants.active = true
    for update;
    if not found or (variant_row.stock - variant_row.reserved) < v_quantity then
      raise exception 'out_of_stock';
    end if;

    update public.product_variants
    set reserved = reserved + v_quantity
    where id = variant_row.id;

    insert into public.stock_reservations (order_id, variant_id, quantity, status)
    values (v_order_id, variant_row.id, v_quantity, 'held');

    insert into public.order_items (order_id, product_id, size, variant_label, quantity, unit_price_cents)
    values (v_order_id, product_row.id, v_size, variant_row.label, v_quantity, product_row.price_cents);

    if coalesce(product_row.type_key, '') = 'tshirt' or product_row.type = 'T-shirt' then
      tee_qty := tee_qty + v_quantity;
    elsif coalesce(product_row.type_key, '') = 'cd'
      or product_row.type = 'CD'
      or v_size in ('CD', 'VINYL')
    then
      cd_qty := cd_qty + v_quantity;
    elsif coalesce(product_row.type_key, '') = 'other' or v_size = 'U' then
      accessory_qty := accessory_qty + v_quantity;
    end if;

    subtotal := subtotal + product_row.price_cents * v_quantity;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'productId', product_row.id,
      'name', product_row.name,
      'size', v_size,
      'variantLabel', variant_row.label,
      'quantity', v_quantity,
      'unitPriceCents', product_row.price_cents
    ));
  end loop;

  if tee_qty + accessory_qty > 6 or cd_qty > 5 then
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

    if promo_row.min_cd_qty > 0 and cd_qty < promo_row.min_cd_qty then
      raise exception 'promo_needs_cds';
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
        and tee_qty >= p.min_tee_qty
        and cd_qty >= p.min_cd_qty
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
      order by
        coalesce(p.amount_off_cents, 0) desc,
        coalesce(p.percent_off, 0) desc
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
    'orderNumber', v_order_number,
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
