-- Journal newsletter : empêche les doublons de trace lors d'un retry API.
alter table public.newsletter_messages
  add column if not exists idempotency_key uuid;

create unique index if not exists newsletter_messages_idempotency_key_idx
  on public.newsletter_messages (idempotency_key)
  where idempotency_key is not null;
