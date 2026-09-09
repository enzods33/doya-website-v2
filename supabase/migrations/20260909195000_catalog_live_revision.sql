-- Signal public pour rafraîchir la boutique sans exposer products / product_variants.
create table if not exists public.catalog_revision (
  id int primary key default 1 check (id = 1),
  updated_at timestamptz not null default now()
);

insert into public.catalog_revision (id) values (1)
on conflict (id) do nothing;

alter table public.catalog_revision enable row level security;

drop policy if exists "catalog_revision_select_public" on public.catalog_revision;
create policy "catalog_revision_select_public"
  on public.catalog_revision
  for select
  to anon, authenticated
  using (true);

revoke all on table public.catalog_revision from public;
grant select on table public.catalog_revision to anon, authenticated;

create or replace function public.bump_catalog_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.catalog_revision (id, updated_at)
  values (1, now())
  on conflict (id) do update set updated_at = excluded.updated_at;
  return null;
end;
$$;

drop trigger if exists products_bump_catalog_revision on public.products;
create trigger products_bump_catalog_revision
  after insert or update or delete on public.products
  for each statement
  execute function public.bump_catalog_revision();

drop trigger if exists product_variants_bump_catalog_revision on public.product_variants;
create trigger product_variants_bump_catalog_revision
  after insert or update or delete on public.product_variants
  for each statement
  execute function public.bump_catalog_revision();

drop trigger if exists promo_codes_bump_catalog_revision on public.promo_codes;
create trigger promo_codes_bump_catalog_revision
  after insert or update or delete on public.promo_codes
  for each statement
  execute function public.bump_catalog_revision();

drop trigger if exists shipping_zones_bump_catalog_revision on public.shipping_zones;
create trigger shipping_zones_bump_catalog_revision
  after insert or update or delete on public.shipping_zones
  for each statement
  execute function public.bump_catalog_revision();

-- Premier bump pour synchroniser les clients déjà ouverts après déploiement.
update public.catalog_revision set updated_at = now() where id = 1;

alter publication supabase_realtime add table public.catalog_revision;
