-- Visites site (agrégat journalier par chemin)
create table if not exists public.site_pageviews (
  day date not null,
  path text not null,
  views integer not null default 0 check (views >= 0),
  primary key (day, path),
  constraint site_pageviews_path_len check (char_length(path) between 1 and 200)
);

alter table public.site_pageviews enable row level security;

revoke all on public.site_pageviews from anon, authenticated, public;
grant select on public.site_pageviews to service_role;
grant all on public.site_pageviews to service_role;

create or replace function public.record_pageview(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean text := left(coalesce(nullif(trim(p_path), ''), '/'), 200);
begin
  if clean like '/admin%' then
    return;
  end if;
  insert into public.site_pageviews (day, path, views)
  values ((timezone('utc', now()))::date, clean, 1)
  on conflict (day, path) do update
    set views = public.site_pageviews.views + 1;
end;
$$;

revoke all on function public.record_pageview(text) from public, anon, authenticated;
grant execute on function public.record_pageview(text) to anon, authenticated, service_role;
