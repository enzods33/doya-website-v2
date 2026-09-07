-- Clics / actions site (agrégat journalier par événement + endroit)
create table if not exists public.site_events (
  day date not null,
  event text not null,
  place text not null,
  count integer not null default 0 check (count >= 0),
  primary key (day, event, place),
  constraint site_events_event_len check (char_length(event) between 1 and 64),
  constraint site_events_place_len check (char_length(place) between 1 and 32)
);

alter table public.site_events enable row level security;

revoke all on public.site_events from anon, authenticated, public;
grant select on public.site_events to service_role;
grant all on public.site_events to service_role;

create or replace function public.record_event(p_event text, p_place text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_event text := lower(left(coalesce(nullif(trim(p_event), ''), ''), 64));
  clean_place text := lower(left(coalesce(nullif(trim(p_place), ''), ''), 32));
begin
  if clean_event not in (
    'newsletter_submit',
    'newsletter_optin',
    'add_to_cart',
    'checkout_start',
    'stream_open',
    'social_open',
    'contact_mail',
    'press_kit'
  ) then
    return;
  end if;
  if clean_place not in ('menu', 'footer', 'cart', 'shop', 'music') then
    return;
  end if;
  insert into public.site_events (day, event, place, count)
  values ((timezone('utc', now()))::date, clean_event, clean_place, 1)
  on conflict (day, event, place) do update
    set count = public.site_events.count + 1;
end;
$$;

revoke all on function public.record_event(text, text) from public, anon, authenticated;
grant execute on function public.record_event(text, text) to anon, authenticated, service_role;
