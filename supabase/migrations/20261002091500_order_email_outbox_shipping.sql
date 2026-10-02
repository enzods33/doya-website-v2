-- Étend l'outbox transactionnelle au mail d'expédition.
alter table public.order_email_outbox
  drop constraint if exists order_email_outbox_kind_check;

alter table public.order_email_outbox
  add constraint order_email_outbox_kind_check
  check (kind in ('paid_confirmation', 'shipped_notification'));
