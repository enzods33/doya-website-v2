-- Historique newsletter admin (indépendant des campagnes marketing Brevo).

create table if not exists public.newsletter_messages (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  name text not null default '',
  preview_text text not null default '',
  html_content text not null,
  mode text not null check (mode in ('send', 'schedule')),
  status text not null default 'sent',
  sent_count integer not null default 0 check (sent_count >= 0),
  brevo_campaign_id integer null,
  scheduled_at timestamptz null,
  sent_at timestamptz not null default now(),
  created_by text null,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_messages_sent_at_idx
  on public.newsletter_messages (sent_at desc);

alter table public.newsletter_messages enable row level security;
revoke all on public.newsletter_messages from anon, authenticated, public;
grant all on public.newsletter_messages to service_role;
