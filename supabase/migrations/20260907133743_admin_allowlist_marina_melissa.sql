-- Ajoute Marina et Melissa à la whitelist admin.

insert into public.admin_allowlist (email) values
  ('marina.doya@gmail.com'),
  ('melissa.doya@gmail.com')
on conflict (email) do nothing;
