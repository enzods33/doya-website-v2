-- Réductions auto lisibles côté boutique (montants synchronisés avec l’admin).
create or replace view public.catalog_auto_promos
with (security_invoker = false) as
select
  code,
  amount_off_cents,
  min_tee_qty,
  min_cd_qty
from public.promo_codes
where auto_apply = true
  and active = true
  and amount_off_cents is not null
  and amount_off_cents > 0;

revoke all on table public.catalog_auto_promos from anon, authenticated, public;
grant select on table public.catalog_auto_promos to anon, authenticated;
