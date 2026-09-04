-- Catalogue merch P224 : Luna Bohemia + DOYA (blanc/noir), stock réel, sans XXL ni article test.

delete from public.stock_reservations;
delete from public.product_variants where size = 'XXL';

alter table public.product_variants
  drop constraint if exists product_variants_size_check;

alter table public.product_variants
  add constraint product_variants_size_check check (
    size in ('XS', 'S', 'M', 'L', 'XL')
  );

-- Conserver les produits encore référencés par d’anciennes commandes (ex. test),
-- mais les retirer de la vente.
update public.products
set on_sale = false, price_cents = null
where id in ('test', 'luna-a', 'luna-b', 'luna-c', 'doya');

delete from public.product_variants
where product_id in ('luna-a', 'luna-b', 'luna-c', 'doya', 'test');

-- Remplacer / upsert le vrai catalogue
insert into public.products (id, name, type, color, price_cents, currency, on_sale)
values
  ('luna-bohemia-white', 'Luna Bohemia', 'T-shirt', 'Blanc', null, 'eur', false),
  ('luna-bohemia-black', 'Luna Bohemia', 'T-shirt', 'Noir', null, 'eur', false),
  ('doya-white', 'DOYA', 'T-shirt', 'Blanc', null, 'eur', false),
  ('doya-black', 'DOYA', 'T-shirt', 'Noir', null, 'eur', false)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  on_sale = excluded.on_sale,
  updated_at = now();

delete from public.product_variants
where product_id in ('luna-bohemia-white', 'luna-bohemia-black', 'doya-white', 'doya-black');

insert into public.product_variants (product_id, size, stock, reserved)
select p.id, s.size, s.stock, 0
from public.products p
cross join (
  values
    ('XS', 35),
    ('S', 45),
    ('M', 45),
    ('L', 20),
    ('XL', 5)
) as s(size, stock)
where p.id in ('luna-bohemia-white', 'luna-bohemia-black', 'doya-white', 'doya-black');

-- Supprimer les anciens SKU inutilisés s’ils ne sont plus référencés
delete from public.products p
where p.id in ('luna-a', 'luna-b', 'luna-c', 'doya')
  and not exists (select 1 from public.order_items oi where oi.product_id = p.id);
