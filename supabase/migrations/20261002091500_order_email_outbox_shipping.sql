-- Étend l'outbox transactionnelle au mail d'expédition.
alter table public.order_email_outbox
  drop constraint if exists order_email_outbox_kind_check;

alter table public.order_email_outbox
  add constraint order_email_outbox_kind_check
  check (kind in ('paid_confirmation', 'shipped_notification'));

alter table public.order_email_outbox
  add column if not exists delivery_key uuid not null default gen_random_uuid();

create unique index if not exists order_email_outbox_delivery_key_idx
  on public.order_email_outbox (delivery_key);
