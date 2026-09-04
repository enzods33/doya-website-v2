-- Prix temporaire tee-shirts merch : 35 €, mis en vente.
-- Ne pas réactiver l’article « test ».

update public.products
set
  price_cents = 3500,
  on_sale = true,
  updated_at = now()
where id in (
  'luna-bohemia-white',
  'luna-bohemia-black',
  'doya-white',
  'doya-black'
);
