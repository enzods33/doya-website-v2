-- Ne plus dépublier les dates à venir au-delà de 10 (le front a « Voir plus »).
-- Passées : max 3 si <10 à venir ; sinon toutes dépubliées.
create or replace function public.prune_concerts_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oldest record;
  upcoming_count integer;
  past_count integer;
  today date := (timezone('utc', now()))::date;
begin
  select count(*)::integer into upcoming_count
  from public.concerts
  where published
    and date >= today;

  if upcoming_count is not null and upcoming_count >= 10 then
    update public.concerts
    set published = false
    where published
      and date < today;
    return null;
  end if;

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

    exit when oldest.id is null;

    update public.concerts
    set published = false
    where id = oldest.id;
  end loop;

  return null;
end;
$$;
