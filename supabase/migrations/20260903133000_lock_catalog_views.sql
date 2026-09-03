-- Les vues catalogue étaient auto-modifiables : anon pouvait insérer
-- dans products via catalog_products. Lecture seule.

revoke all on table public.catalog_products from anon, authenticated, public;
revoke all on table public.catalog_variants from anon, authenticated, public;
grant select on table public.catalog_products to anon, authenticated;
grant select on table public.catalog_variants to anon, authenticated;
