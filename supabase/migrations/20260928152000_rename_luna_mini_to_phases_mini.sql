-- Aligne le nom du tee-shirt enfant rouge sur la gamme Phases.
update public.products
set name = 'Phases Mini'
where id = 'tee-luna-mini-red'
  and name is distinct from 'Phases Mini';
