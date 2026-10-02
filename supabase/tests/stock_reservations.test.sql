begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into public.products (id, name, type, color, price_cents, on_sale)
values ('stock-test', 'Stock test', 'T-shirt', 'Noir', 1000, false);

insert into public.product_variants (id, product_id, size, label, active, sort_order, stock, reserved)
values ('00000000-0000-4000-8000-000000000001', 'stock-test', 'S', 'S', true, 10, 2, 2);

insert into public.products (id, name, type, color, type_key, color_key, price_cents, on_sale)
values ('variant-test', 'Variant test', 'T-shirt', 'Noir', 'tshirt', 'black', 1500, true);

insert into public.product_variants (id, product_id, size, label, active, sort_order, stock, reserved)
values ('00000000-0000-4000-8000-000000000002', 'variant-test', 'Noir / M', 'Noir / M', true, 10, 3, 0);

insert into public.orders (id, order_number, email, subtotal_cents, total_cents, created_at, stripe_checkout_session_id)
values
  ('00000000-0000-4000-8000-000000000011', 'DOYA-90001', 'test@example.invalid', 1000, 1000,
    now() - interval '36 minutes', 'cs_test_still_open'),
  ('00000000-0000-4000-8000-000000000012', 'DOYA-90002', 'test@example.invalid', 1000, 1000,
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
select ok(not has_function_privilege('anon', 'public.bump_catalog_revision()', 'EXECUTE'),
  'bump_catalog_revision n''est pas exécutable par anon');

select is(
  public.create_pending_order(
    'variant@example.invalid',
    null,
    '[{"productId":"variant-test","size":"Noir / M","quantity":1}]'::jsonb,
    null,
    0
  ) -> 'lines' -> 0 ->> 'variantLabel',
  'Noir / M',
  'Le libellé libre remonte dans la réponse de création de commande'
);

select is(
  (select variant_label from public.order_items where product_id = 'variant-test' limit 1),
  'Noir / M',
  'La ligne de commande conserve un instantané du libellé'
);

select is(
  (select reserved from public.product_variants where id = '00000000-0000-4000-8000-000000000002'),
  1,
  'La variante libre réserve bien son stock'
);

insert into public.orders (
  id, order_number, email, status, subtotal_cents, shipping_cents, total_cents, stripe_checkout_session_id
)
values (
  '00000000-0000-4000-8000-000000000013', 'DOYA-90003', 'paid-test@example.invalid',
  'pending', 1500, 600, 2100, 'cs_test_exact_amounts'
);

insert into public.stock_reservations (order_id, variant_id, quantity)
values (
  '00000000-0000-4000-8000-000000000013',
  '00000000-0000-4000-8000-000000000002',
  1
);
update public.product_variants
set reserved = reserved + 1
where id = '00000000-0000-4000-8000-000000000002';

select throws_ok(
  $q$ select public.mark_order_paid_from_stripe(
    '00000000-0000-4000-8000-000000000013', 'pi_wrong_shipping', null, null, 700, 2100, null
  ) $q$,
  'P0001',
  'shipping_amount_mismatch',
  'Un montant de livraison différent est refusé'
);

select throws_ok(
  $q$ select public.mark_order_paid_from_stripe(
    '00000000-0000-4000-8000-000000000013', 'pi_wrong_total', null, null, 600, 2200, null
  ) $q$,
  'P0001',
  'total_amount_mismatch',
  'Un total Stripe différent est refusé'
);

select lives_ok(
  $q$ select public.mark_order_paid_from_stripe(
    '00000000-0000-4000-8000-000000000013', 'pi_exact', 'Client', '{}'::jsonb, 600, 2100, null
  ) $q$,
  'Les montants exacts finalisent la commande'
);

select is(
  (select status from public.orders where id = '00000000-0000-4000-8000-000000000013'),
  'paid',
  'La commande exacte est marquée payée'
);

select ok(
  not has_function_privilege('anon', 'public.claim_due_order_emails(integer)', 'EXECUTE'),
  'La claim outbox email reste inaccessible à anon'
);

select * from finish();
rollback;
