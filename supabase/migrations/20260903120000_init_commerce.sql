-- Boutique DOYA : stock, promos, commandes.
-- Les clients ne lisent qu’un catalogue public. Prix, stocks et codes
-- sont appliqués uniquement par des fonctions service_role.

revoke all on schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema public to service_role;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create table public.products (
  id text primary key,
  name text not null,
  type text not null default 'T-shirt',
  color text not null default 'Noir',
  price_cents integer check (price_cents is null or price_cents > 0),
  currency text not null default 'eur' check (currency = 'eur'),
  on_sale boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sale_requires_price check (not on_sale or price_cents is not null)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products (id) on delete cascade,
  size text not null check (size in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  stock integer not null default 0 check (stock >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  unique (product_id, size),
  constraint reserved_not_above_stock check (reserved <= stock)
);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  percent_off numeric(5, 2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_off_cents integer check (amount_off_cents is null or amount_off_cents > 0),
  min_subtotal_cents integer not null default 0 check (min_subtotal_cents >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redeemed integer not null default 0 check (redeemed >= 0),
  held integer not null default 0 check (held >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  one_per_customer boolean not null default true,
  created_at timestamptz not null default now(),
  constraint promo_code_normalized check (code = upper(code) and code !~ '\s'),
  constraint promo_has_one_discount check (
    (percent_off is not null)::integer + (amount_off_cents is not null)::integer = 1
  ),
  constraint promo_hold_within_cap check (
    max_redemptions is null or redeemed + held <= max_redemptions
  )
);

create unique index promo_codes_code_key on public.promo_codes (code);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled', 'expired', 'refunded')),
  currency text not null default 'eur',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  promo_id uuid references public.promo_codes (id),
  promo_code text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  shipping_name text,
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id text not null references public.products (id),
  size text not null,
  quantity integer not null check (quantity > 0 and quantity <= 5),
  unit_price_cents integer not null check (unit_price_cents > 0)
);

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity > 0),
  status text not null default 'held' check (status in ('held', 'committed', 'released')),
  created_at timestamptz not null default now(),
  unique (order_id, variant_id)
);

create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promo_codes (id),
  order_id uuid not null references public.orders (id) on delete cascade,
  email text not null,
  user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (order_id)
);

create table public.processed_stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create view public.catalog_products
with (security_invoker = false) as
select id, name, type, color, price_cents, currency
from public.products
where on_sale = true and price_cents is not null and price_cents > 0;

create view public.catalog_variants
with (security_invoker = false) as
select
  v.id,
  v.product_id,
  v.size,
  greatest(v.stock - v.reserved, 0)::integer as available
from public.product_variants v
join public.products p on p.id = v.product_id
where p.on_sale = true and p.price_cents is not null and p.price_cents > 0;

grant select on public.catalog_products to anon, authenticated;
grant select on public.catalog_variants to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.promo_codes enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.processed_stripe_events enable row level security;

revoke all on public.profiles from anon, authenticated, public;
revoke all on public.products from anon, authenticated, public;
revoke all on public.product_variants from anon, authenticated, public;
revoke all on public.promo_codes from anon, authenticated, public;
revoke all on public.orders from anon, authenticated, public;
revoke all on public.order_items from anon, authenticated, public;
revoke all on public.stock_reservations from anon, authenticated, public;
revoke all on public.promo_redemptions from anon, authenticated, public;
revoke all on public.processed_stripe_events from anon, authenticated, public;

grant select on public.profiles to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy orders_select_own on public.orders
  for select to authenticated
  using (user_id = auth.uid() and status in ('paid', 'refunded'));

create policy order_items_select_own on public.order_items
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
        and o.status in ('paid', 'refunded')
    )
  );

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.claim_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
  viewer uuid;
  viewer_email text;
begin
  viewer := auth.uid();
  if viewer is null then
    raise exception 'not_authenticated';
  end if;

  viewer_email := lower(auth.jwt() ->> 'email');
  if viewer_email is null or viewer_email = '' then
    return 0;
  end if;

  update public.orders
  set user_id = viewer
  where user_id is null
    and status = 'paid'
    and lower(email) = viewer_email;

  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

revoke all on function public.claim_orders() from public;
grant execute on function public.claim_orders() to authenticated;

create function public.release_reservation(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hold public.stock_reservations;
  order_row public.orders;
begin
  if auth.role() is distinct from 'service_role' then
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

create function public.commit_reservation(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hold public.stock_reservations;
  order_row public.orders;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  select * into order_row from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_missing';
  end if;
  if order_row.status = 'paid' then
    return;
  end if;
  if order_row.status is distinct from 'pending' then
    raise exception 'order_not_pending';
  end if;

  for hold in
    select * from public.stock_reservations
    where order_id = p_order_id and status = 'held'
    for update
  loop
    update public.product_variants
    set stock = stock - hold.quantity,
        reserved = reserved - hold.quantity
    where id = hold.variant_id;

    update public.stock_reservations
    set status = 'committed'
    where id = hold.id;
  end loop;

  if order_row.promo_id is not null then
    update public.promo_codes
    set held = greatest(held - 1, 0),
        redeemed = redeemed + 1
    where id = order_row.promo_id;

    insert into public.promo_redemptions (promo_id, order_id, email, user_id)
    values (order_row.promo_id, p_order_id, lower(order_row.email), order_row.user_id)
    on conflict (order_id) do nothing;
  end if;

  update public.orders
  set status = 'paid', paid_at = now()
  where id = p_order_id;
end;
$$;

create function public.create_pending_order(
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
  order_id uuid;
  product_id text;
  size text;
  quantity integer;
  line_count integer := 0;
  total_qty integer := 0;
  subtotal integer := 0;
  discount integer := 0;
  shipping integer;
  normalized_email text;
  normalized_code text;
  lines jsonb := '[]'::jsonb;
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
  returning id into order_id;

  for item in
    select value
    from jsonb_array_elements(p_items) as t(value)
    order by value ->> 'productId', value ->> 'size'
  loop
    product_id := item ->> 'productId';
    size := upper(item ->> 'size');
    quantity := (item ->> 'quantity')::integer;

    if product_id is null or product_id !~ '^[a-z0-9-]+$' then
      raise exception 'invalid_product';
    end if;
    if size not in ('XS', 'S', 'M', 'L', 'XL', 'XXL') then
      raise exception 'invalid_size';
    end if;
    if quantity is null or quantity < 1 or quantity > 5 then
      raise exception 'invalid_quantity';
    end if;

    line_count := line_count + 1;
    total_qty := total_qty + quantity;
    if total_qty > 12 then
      raise exception 'too_many_items';
    end if;

    select * into product_row from public.products where id = product_id for update;
    if not found or not product_row.on_sale or product_row.price_cents is null or product_row.price_cents <= 0 then
      raise exception 'product_unavailable';
    end if;

    select * into variant_row
    from public.product_variants
    where product_variants.product_id = product_id and product_variants.size = size
    for update;
    if not found or (variant_row.stock - variant_row.reserved) < quantity then
      raise exception 'out_of_stock';
    end if;

    update public.product_variants
    set reserved = reserved + quantity
    where id = variant_row.id;

    insert into public.stock_reservations (order_id, variant_id, quantity, status)
    values (order_id, variant_row.id, quantity, 'held');

    insert into public.order_items (order_id, product_id, size, quantity, unit_price_cents)
    values (order_id, product_row.id, size, quantity, product_row.price_cents);

    subtotal := subtotal + product_row.price_cents * quantity;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'productId', product_row.id,
      'name', product_row.name,
      'size', size,
      'quantity', quantity,
      'unitPriceCents', product_row.price_cents
    ));
  end loop;

  if p_promo_code is not null and btrim(p_promo_code) <> '' then
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

    if promo_row.one_per_customer and exists (
      select 1
      from public.promo_redemptions r
      where r.promo_id = promo_row.id and r.email = normalized_email
    ) then
      raise exception 'promo_already_used';
    end if;

    if promo_row.percent_off is not null then
      discount := floor(subtotal * promo_row.percent_off / 100);
    else
      discount := least(promo_row.amount_off_cents, subtotal);
    end if;

    update public.promo_codes set held = held + 1 where id = promo_row.id;

    update public.orders
    set promo_id = promo_row.id, promo_code = promo_row.code
    where id = order_id;
  end if;

  update public.orders
  set subtotal_cents = subtotal,
      discount_cents = discount,
      total_cents = subtotal - discount + shipping
  where id = order_id;

  return jsonb_build_object(
    'orderId', order_id,
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

create function public.release_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  stale uuid;
  released integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
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

create function public.attach_stripe_session(p_order_id uuid, p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  update public.orders
  set stripe_checkout_session_id = p_session_id
  where id = p_order_id and stripe_checkout_session_id is null;
end;
$$;

create function public.mark_order_paid_from_stripe(
  p_order_id uuid,
  p_payment_intent text,
  p_shipping_name text,
  p_shipping_address jsonb
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

  update public.orders
  set stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
      shipping_name = coalesce(p_shipping_name, shipping_name),
      shipping_address = coalesce(p_shipping_address, shipping_address)
  where id = p_order_id;

  perform public.commit_reservation(p_order_id);
end;
$$;

create function public.record_stripe_event(p_event_id text, p_event_type text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;

  insert into public.processed_stripe_events (event_id, event_type)
  values (p_event_id, p_event_type)
  on conflict (event_id) do nothing;

  return found;
end;
$$;

revoke all on function public.release_reservation(uuid) from public;
revoke all on function public.commit_reservation(uuid) from public;
revoke all on function public.create_pending_order(text, uuid, jsonb, text, integer) from public;
revoke all on function public.release_stale_reservations() from public;
revoke all on function public.attach_stripe_session(uuid, text) from public;
revoke all on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb) from public;
revoke all on function public.record_stripe_event(text, text) from public;

grant execute on function public.release_reservation(uuid) to service_role;
grant execute on function public.commit_reservation(uuid) to service_role;
grant execute on function public.create_pending_order(text, uuid, jsonb, text, integer) to service_role;
grant execute on function public.release_stale_reservations() to service_role;
grant execute on function public.attach_stripe_session(uuid, text) to service_role;
grant execute on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb) to service_role;
grant execute on function public.record_stripe_event(text, text) to service_role;

insert into public.products (id, name, type, color, price_cents, on_sale)
values
  ('luna-a', 'Luna Bohemia A', 'T-shirt', 'Noir', null, false),
  ('luna-b', 'Luna Bohemia B', 'T-shirt', 'Noir', null, false),
  ('luna-c', 'Luna Bohemia C', 'T-shirt', 'Noir', null, false),
  ('doya', 'DOYA', 'T-shirt', 'Noir', null, false);

insert into public.product_variants (product_id, size, stock, reserved)
select products.id, sizes.size, 0, 0
from public.products
cross join (values ('XS'), ('S'), ('M'), ('L'), ('XL'), ('XXL')) as sizes(size);
