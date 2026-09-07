-- Harden launch: index stale pending orders + tighter pageview paths

create index if not exists orders_pending_created_at_idx
  on public.orders (created_at)
  where status = 'pending';

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

  -- N'accepte que les chemins du site public (réduit le spam de paths inventés).
  if not (
    clean = '/'
    or clean in ('/panier', '/commande', '/mentions-legales', '/cgv', '/confidentialite')
    or clean ~ '^/#[a-z0-9_-]+$'
  ) then
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
