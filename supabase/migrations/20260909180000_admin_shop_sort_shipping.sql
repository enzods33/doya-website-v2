-- Boutique admin : ordre d’affichage, images produit, zones de port éditables.

alter table public.products
  add column if not exists sort_order integer not null default 100;

alter table public.products
  add column if not exists image_front_url text;

alter table public.products
  add column if not exists image_back_url text;

alter table public.products
  add column if not exists image_width integer;

alter table public.products
  add column if not exists image_height integer;

alter table public.products
  add column if not exists type_key text;

alter table public.products
  add column if not exists color_key text;

alter table public.products
  drop constraint if exists products_image_dims_check;

alter table public.products
  add constraint products_image_dims_check check (
    (image_width is null or image_width > 0)
    and (image_height is null or image_height > 0)
  );

alter table public.products
  drop constraint if exists products_type_key_check;

alter table public.products
  add constraint products_type_key_check check (
    type_key is null or type_key in ('tshirt', 'cd', 'other')
  );

update public.products
set sort_order = 10, type_key = 'cd', color_key = 'digipack', updated_at = now()
where id = 'cd-luna-bohemia';

update public.products
set sort_order = 20, type_key = 'tshirt', color_key = 'white', updated_at = now()
where id = 'luna-bohemia-white';

update public.products
set sort_order = 30, type_key = 'tshirt', color_key = 'black', updated_at = now()
where id = 'luna-bohemia-black';

update public.products
set sort_order = 40, type_key = 'tshirt', color_key = 'white', updated_at = now()
where id = 'doya-white';

update public.products
set sort_order = 50, type_key = 'tshirt', color_key = 'black', updated_at = now()
where id = 'doya-black';

update public.products
set sort_order = 999, updated_at = now()
where id = 'test';

drop view if exists public.catalog_products;

create view public.catalog_products
with (security_invoker = false) as
select
  id,
  name,
  type,
  color,
  price_cents,
  currency,
  default_view,
  sort_order,
  image_front_url,
  image_back_url,
  image_width,
  image_height,
  type_key,
  color_key
from public.products
where on_sale = true and price_cents is not null and price_cents > 0;

revoke all on table public.catalog_products from anon, authenticated, public;
grant select on table public.catalog_products to anon, authenticated;

create table if not exists public.shipping_zones (
  id text primary key,
  display_name text not null,
  amount_cents integer not null check (amount_cents >= 0 and amount_cents <= 50000),
  countries text[] not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.shipping_zones (id, display_name, amount_cents, countries, sort_order)
values
  ('fr', 'France métropole', 600, array['FR', 'MC'], 10),
  ('eu', 'Europe (UE + Suisse)', 800, array['BE', 'CH', 'LU', 'DE', 'NL', 'ES', 'IT', 'PT', 'AT', 'IE'], 20),
  (
    'dom',
    'DOM-TOM (Réunion, Antilles…)',
    1290,
    array['RE', 'GP', 'MQ', 'GF', 'YT', 'PM', 'BL', 'MF', 'NC', 'PF', 'WF', 'TF'],
    30
  )
on conflict (id) do nothing;

alter table public.shipping_zones enable row level security;

drop policy if exists shipping_zones_select on public.shipping_zones;
create policy shipping_zones_select
  on public.shipping_zones
  for select
  to anon, authenticated
  using (true);

revoke all on table public.shipping_zones from anon, authenticated, public;
grant select on table public.shipping_zones to anon, authenticated;
grant all on table public.shipping_zones to service_role;
