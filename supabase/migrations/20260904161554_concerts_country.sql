-- Pays de tournée (code court type FR / ES / PO).
alter table public.concerts
  add column if not exists country text;

alter table public.concerts
  drop constraint if exists concerts_country_format;

alter table public.concerts
  add constraint concerts_country_format check (
    country is null
    or country ~ '^[A-Za-z]{2,3}$'
  );

-- Fenêtre d’affichage : max 10 dates publiées (les plus anciennes sortent).
-- Les dates passées restantes s’affichent rayées côté front.
create or replace function public.prune_concerts_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oldest record;
  published_count integer;
begin
  loop
    select count(*)::integer into published_count
    from public.concerts
    where published;

    if published_count is null or published_count <= 10 then
      exit;
    end if;

    select id
    into oldest
    from public.concerts
    where published
    order by date asc, created_at asc, id asc
    limit 1;

    if oldest.id is null then
      exit;
    end if;

    update public.concerts
    set published = false
    where id = oldest.id;
  end loop;

  return null;
end;
$$;
