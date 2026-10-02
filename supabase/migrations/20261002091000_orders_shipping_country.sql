-- Fige le pays choisi au moment de créer la session Stripe.
alter table public.orders
  add column if not exists shipping_country text;

alter table public.orders
  drop constraint if exists orders_shipping_country_check;

alter table public.orders
  add constraint orders_shipping_country_check
  check (
    shipping_country is null
    or shipping_country ~ '^[A-Z]{2}$'
  );
