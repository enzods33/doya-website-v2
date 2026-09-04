-- Taille unique U pour CD (et futurs articles sans taillage)
alter table public.product_variants
  drop constraint if exists product_variants_size_check;

alter table public.product_variants
  add constraint product_variants_size_check check (
    size in ('XS', 'S', 'M', 'L', 'XL', 'U')
  );

-- CD Luna Bohemia : 18 €, en vente, stock placeholder 100
insert into public.products (id, name, type, color, price_cents, currency, on_sale)
values
  ('cd-luna-bohemia', 'Luna Bohemia', 'CD', 'Digipack', 1800, 'eur', true)
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  on_sale = excluded.on_sale,
  updated_at = now();

delete from public.product_variants
where product_id = 'cd-luna-bohemia';

insert into public.product_variants (product_id, size, stock, reserved)
values ('cd-luna-bohemia', 'U', 100, 0);
