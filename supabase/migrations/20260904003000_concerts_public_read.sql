-- Dates live / concerts : lecture publique des lignes published.
create table public.concerts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  city text not null,
  venue text not null,
  ticket_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint concerts_city_nonempty check (char_length(trim(city)) > 0),
  constraint concerts_venue_nonempty check (char_length(trim(venue)) > 0),
  constraint concerts_ticket_url_https check (
    ticket_url is null
    or ticket_url ~* '^https://'
  )
);

create index concerts_date_idx on public.concerts (date);

alter table public.concerts enable row level security;

revoke all on table public.concerts from anon, authenticated, public;
grant select on table public.concerts to anon, authenticated;

create policy concerts_select_published
  on public.concerts
  for select
  to anon, authenticated
  using (published = true);
