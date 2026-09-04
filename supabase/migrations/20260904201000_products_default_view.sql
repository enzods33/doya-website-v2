-- Vue par défaut boutique (front|back), utilisable aussi en back-office.
alter table public.products
  add column if not exists default_view text not null default 'front';

alter table public.products
  drop constraint if exists products_default_view_check;

alter table public.products
  add constraint products_default_view_check check (
    default_view in ('front', 'back')
  );

-- Tees + CD → face par défaut
update public.products
set default_view = 'front', updated_at = now()
where id in ('luna-bohemia-white', 'luna-bohemia-black', 'doya-white', 'doya-black', 'cd-luna-bohemia');

-- Garantir CD 18 € en vente (ne touche pas les tees)
insert into public.products (id, name, type, color, price_cents, currency, on_sale, default_view)
values
  ('cd-luna-bohemia', 'Luna Bohemia', 'CD', 'Digipack', 1800, 'eur', true, 'front')
on conflict (id) do update set
  name = excluded.name,
  type = excluded.type,
  color = excluded.color,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  on_sale = excluded.on_sale,
  default_view = excluded.default_view,
  updated_at = now();

insert into public.product_variants (product_id, size, stock, reserved)
select 'cd-luna-bohemia', 'U', 100, 0
where not exists (
  select 1 from public.product_variants
  where product_id = 'cd-luna-bohemia' and size = 'U'
);

-- Exposer default_view via catalog_products
drop view if exists public.catalog_products;

create view public.catalog_products
with (security_invoker = false) as
select id, name, type, color, price_cents, currency, default_view
from public.products
where on_sale = true and price_cents is not null and price_cents > 0;

revoke all on table public.catalog_products from anon, authenticated, public;
grant select on table public.catalog_products to anon, authenticated;
