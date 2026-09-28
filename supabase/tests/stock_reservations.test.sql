begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into public.products (id, name, type, color, price_cents, on_sale)
values ('stock-test', 'Stock test', 'T-shirt', 'Noir', 1000, false);

insert into public.product_variants (id, product_id, size, stock, reserved)
values ('00000000-0000-4000-8000-000000000001', 'stock-test', 'S', 2, 2);

insert into public.orders (id, email, subtotal_cents, total_cents, created_at, stripe_checkout_session_id)
values
  ('00000000-0000-4000-8000-000000000011', 'test@example.invalid', 1000, 1000,
    now() - interval '36 minutes', 'cs_test_still_open'),
  ('00000000-0000-4000-8000-000000000012', 'test@example.invalid', 1000, 1000,
    now() - interval '36 minutes', null);

insert into public.stock_reservations (order_id, variant_id, quantity)
values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 1),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 1);

set local request.jwt.claim.role = 'service_role';

select is(public.release_stale_reservations(), 1, 'Seule la réservation sans session est libérée');
select is((select status from public.orders where id = '00000000-0000-4000-8000-000000000011'),
  'pending', 'La commande avec session reste payable');
select is((select status from public.orders where id = '00000000-0000-4000-8000-000000000012'),
  'expired', 'La commande sans session expire');
select is((select status from public.stock_reservations where order_id = '00000000-0000-4000-8000-000000000011'),
  'held', 'Le stock de la session Stripe reste réservé');
select is((select reserved from public.product_variants where id = '00000000-0000-4000-8000-000000000001'),
  1, 'Une seule unité reste réservée');

select * from finish();
rollback;
