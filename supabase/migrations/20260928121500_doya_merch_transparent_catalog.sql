-- Catalogue de la collection DOYA du 28 septembre 2026.
-- Une réapplication ne remet jamais le stock à zéro ni n'efface les réservations.
update public.products set price_cents = 2000
where id in ('luna-bohemia-white', 'luna-bohemia-black', 'doya-white', 'doya-black');

insert into public.products
  (id, name, type, color, price_cents, currency, on_sale, sort_order, default_view,
   image_front_url, image_back_url, image_width, image_height, type_key, color_key)
values
  ('tee-luna-mini-red', 'Luna Mini', 'T-shirt', 'Rouge', 1600, 'eur', true, 60, 'front',
   'https://doya.guzzler-bot.cloud/shop/tee-luna-mini-front-transparent.png',
   'https://doya.guzzler-bot.cloud/shop/tee-luna-mini-back-transparent.png', 982, 953, 'tshirt', 'red'),
  ('cap-luna-black', 'Luna Bohemia', 'Casquette', 'Noir', 2000, 'eur', true, 70, 'front',
   'https://doya.guzzler-bot.cloud/shop/cap-luna-front-transparent.png',
   'https://doya.guzzler-bot.cloud/shop/cap-luna-back-transparent.png', 971, 715, 'other', 'black'),
  ('tote-eclipse-black', 'Éclipse', 'Tote bag', 'Noir', 1200, 'eur', true, 80, 'front',
   'https://doya.guzzler-bot.cloud/shop/tote-eclipse-front-transparent.png',
   'https://doya.guzzler-bot.cloud/shop/tote-eclipse-back-transparent.png', 620, 1031, 'other', 'black')
on conflict (id) do nothing;

insert into public.product_variants (product_id, size, stock)
values
  ('tee-luna-mini-red', '3/4', 15), ('tee-luna-mini-red', '5/6', 15),
  ('tee-luna-mini-red', '7/8', 15), ('tee-luna-mini-red', '9/11', 15),
  ('tee-luna-mini-red', '12/13', 15),
  ('cap-luna-black', 'U', 100), ('tote-eclipse-black', 'U', 100)
on conflict (product_id, size) do nothing;

-- Sur une boutique déjà renseignée, seule l'image change : prix et stocks restent intacts.
update public.products set
  image_front_url = 'https://doya.guzzler-bot.cloud/shop/tee-luna-mini-front-transparent.png',
  image_back_url = 'https://doya.guzzler-bot.cloud/shop/tee-luna-mini-back-transparent.png',
  image_width = 982, image_height = 953
where id = 'tee-luna-mini-red';

update public.products set
  image_front_url = 'https://doya.guzzler-bot.cloud/shop/cap-luna-front-transparent.png',
  image_back_url = 'https://doya.guzzler-bot.cloud/shop/cap-luna-back-transparent.png',
  image_width = 971, image_height = 715
where id = 'cap-luna-black';

update public.products set
  image_front_url = 'https://doya.guzzler-bot.cloud/shop/tote-eclipse-front-transparent.png',
  image_back_url = 'https://doya.guzzler-bot.cloud/shop/tote-eclipse-back-transparent.png',
  image_width = 620, image_height = 1031
where id = 'tote-eclipse-black';
