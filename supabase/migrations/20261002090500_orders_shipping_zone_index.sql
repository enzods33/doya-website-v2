-- Index FK recommandé par l'advisor Supabase.
create index if not exists orders_shipping_zone_id_idx
  on public.orders (shipping_zone_id);
