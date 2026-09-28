-- Autorise l'ErrorBoundary public à comptabiliser les erreurs applicatives.
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
    'press_kit',
    'app_error'
  ) then
    return;
  end if;
  if clean_place not in ('menu', 'footer', 'cart', 'shop', 'music', 'boundary') then
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
