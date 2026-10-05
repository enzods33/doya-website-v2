-- Clip mis en avant : lecture publique uniquement, écriture via Edge Function admin.
-- À appliquer avec la migration et le déploiement de `admin-clips` requis ; non appliqué ici.

create table if not exists public.site_featured_clip (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  title text not null default 'Solo tú' check (char_length(title) between 1 and 120),
  video_url text not null check (char_length(video_url) <= 2048),
  updated_at timestamptz not null default now()
);

alter table public.site_featured_clip enable row level security;
revoke all on public.site_featured_clip from anon, authenticated, public;
grant select on public.site_featured_clip to anon, authenticated;
grant all on public.site_featured_clip to service_role;

create policy site_featured_clip_select_public on public.site_featured_clip
  for select
  to anon, authenticated
  using (true);

insert into public.site_featured_clip (id, enabled, title, video_url)
values (true, true, 'Solo tú', 'https://www.youtube.com/watch?v=sO-I92cpFSY')
on conflict (id) do nothing;
