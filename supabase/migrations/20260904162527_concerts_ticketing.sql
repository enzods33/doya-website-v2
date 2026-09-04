-- Billetterie : link (URL), soon (à venir), none (pas de billetterie).
alter table public.concerts
  add column if not exists ticketing text not null default 'none';

alter table public.concerts
  drop constraint if exists concerts_ticketing_values;

alter table public.concerts
  add constraint concerts_ticketing_values check (
    ticketing in ('link', 'soon', 'none')
  );

alter table public.concerts
  drop constraint if exists concerts_ticketing_link_url;

alter table public.concerts
  add constraint concerts_ticketing_link_url check (
    ticketing <> 'link'
    or (ticket_url is not null and ticket_url ~* '^https://')
  );

comment on column public.concerts.ticketing is 'link = billetterie en ligne ; soon = à venir ; none = pas de billetterie';

-- Au-delà de 10 : dépublier d’abord les plus anciennes dates passées.
create or replace function public.prune_concerts_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oldest record;
  published_count integer;
  today date := (timezone('utc', now()))::date;
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
