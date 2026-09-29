-- Le nom commercial vient du catalogue/back-office.
-- Garder l'identifiant technique historique évite toute rupture panier/stock.
update public.products
set name = 'DOYA'
where id = 'tote-eclipse-black'
  and name is distinct from 'DOYA';
