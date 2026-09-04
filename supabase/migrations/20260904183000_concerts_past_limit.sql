-- Affichage : au plus 3 dates passées (les plus récentes), max 10 au total.
create or replace function public.prune_concerts_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oldest record;
  published_count integer;
  past_count integer;
  today date := (timezone('utc', now()))::date;
begin
  -- D’abord : ne garder que les 3 passées les plus récentes
  loop
    select count(*)::integer into past_count
    from public.concerts
    where published
      and date < today;

    if past_count is null or past_count <= 3 then
      exit;
    end if;

    select id
    into oldest
    from public.concerts
    where published
      and date < today
    order by date asc, created_at asc, id asc
    limit 1;

    if oldest.id is null then
      exit;
    end if;

    update public.concerts
    set published = false
    where id = oldest.id;
  end loop;

  -- Puis : plafond global de 10 (sortir encore des passées, sinon les plus anciennes à venir)
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
      and date < today
    order by date asc, created_at asc, id asc
    limit 1;

    if oldest.id is null then
      select id
      into oldest
      from public.concerts
      where published
      order by date asc, created_at asc, id asc
      limit 1;
    end if;

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
