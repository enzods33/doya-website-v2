-- Conserve la langue choisie au checkout pour les e-mails transactionnels.
-- Les commandes historiques restent valides et utilisent le français par défaut.

alter table public.orders
  add column if not exists locale text not null default 'fr';

alter table public.orders
  drop constraint if exists orders_locale_check;

alter table public.orders
  add constraint orders_locale_check
  check (locale in ('fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar'));
