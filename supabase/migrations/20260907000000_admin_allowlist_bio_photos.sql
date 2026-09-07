-- Admin allowlist + bio gallery (CRUD via Edge Functions service_role).

create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_allowlist_email_lower check (email = lower(email))
);

alter table public.admin_allowlist enable row level security;
revoke all on public.admin_allowlist from anon, authenticated, public;
grant select on public.admin_allowlist to service_role;

insert into public.admin_allowlist (email) values
  ('stephanedasil@gmail.com'),
  ('dasildoya@gmail.com'),
  ('dasilveira.enzo@gmail.com'),
  ('almenaprod@gmail.com'),
  ('doyamusicofficial@gmail.com')
on conflict (email) do nothing;

create table if not exists public.bio_photos (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  public_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort_order integer not null default 0,
  published boolean not null default true,
  alt text not null default 'Photographie DOYA — Luna Bohemia.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bio_photos_published_sort_idx
  on public.bio_photos (published, sort_order, created_at);

alter table public.bio_photos enable row level security;
revoke all on public.bio_photos from anon, authenticated, public;
grant select on public.bio_photos to anon, authenticated;
grant all on public.bio_photos to service_role;

create policy bio_photos_select_published on public.bio_photos
  for select to anon, authenticated
  using (published = true);

-- Promote allowlisted users to admin on signup / first login profile create.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(coalesce(new.email, ''));
  is_admin boolean := false;
begin
  if normalized <> '' then
    select exists (
      select 1 from public.admin_allowlist where email = normalized
    ) into is_admin;
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, normalized, case when is_admin then 'admin' else 'customer' end)
  on conflict (id) do update
    set email = excluded.email,
        role = case
          when exists (select 1 from public.admin_allowlist where email = excluded.email)
          then 'admin'
          else public.profiles.role
        end;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to postgres, service_role;

-- Promote existing profiles already on the allowlist.
update public.profiles p
set role = 'admin'
from public.admin_allowlist a
where lower(p.email) = a.email
  and p.role is distinct from 'admin';
