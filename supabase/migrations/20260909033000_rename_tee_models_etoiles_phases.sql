-- Noms d’affichage tee : Étoiles (monogramme + étoiles) / Phases (phases lunaires + tracklist).
-- IDs SKU inchangés (luna-bohemia-*, doya-*) pour ne pas casser panier / commandes / stocks.

update public.products
set name = 'Étoiles'
where id in ('luna-bohemia-white', 'luna-bohemia-black');

update public.products
set name = 'Phases'
where id in ('doya-white', 'doya-black');
