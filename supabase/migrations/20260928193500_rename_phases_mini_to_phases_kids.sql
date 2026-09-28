-- Aligne le nom commercial de l'article enfant rouge sur la nomenclature validée.
update public.products
set name = 'Phases Kids'
where id = 'tee-luna-mini-red'
  and name is distinct from 'Phases Kids';
