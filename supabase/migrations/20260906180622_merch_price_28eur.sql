-- T-shirts merch : 28 €
update public.products
set price_cents = 2800
where id in (
  'doya-black',
  'doya-white',
  'luna-bohemia-black',
  'luna-bohemia-white'
);
