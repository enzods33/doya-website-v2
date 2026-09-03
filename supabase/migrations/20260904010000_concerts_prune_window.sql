-- Dépublie (published = false) les dates passées en tête de liste.
-- Aucun plafond : toutes les dates futures restent publiées.
create or replace function public.prune_concerts_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oldest record;
begin
  loop
    select id, date
    into oldest
    from public.concerts
    where published
    order by date asc, created_at asc, id asc
    limit 1;

    if oldest.id is null then
      exit;
    end if;

    if oldest.date >= (timezone('utc', now()))::date then
      exit;
    end if;

    update public.concerts
    set published = false
    where id = oldest.id;
  end loop;

  return null;
end;
$$;

drop trigger if exists concerts_prune_window on public.concerts;

create trigger concerts_prune_window
  after insert or update of date, published
  on public.concerts
  for each statement
  execute function public.prune_concerts_window();

revoke all on function public.prune_concerts_window() from public;
grant execute on function public.prune_concerts_window() to postgres, service_role;
