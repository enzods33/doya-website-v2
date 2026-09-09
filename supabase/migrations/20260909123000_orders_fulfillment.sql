-- Fulfillment tracking for paid orders (admin only).

alter table public.orders
  add column if not exists fulfillment_status text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz;

update public.orders
set fulfillment_status = 'to_ship'
where status = 'paid'
  and (fulfillment_status is null or fulfillment_status = '');

update public.orders
set fulfillment_status = 'to_ship'
where fulfillment_status is null;

alter table public.orders
  alter column fulfillment_status set default 'to_ship';

alter table public.orders
  alter column fulfillment_status set not null;

alter table public.orders
  drop constraint if exists orders_fulfillment_status_check;

alter table public.orders
  add constraint orders_fulfillment_status_check
  check (fulfillment_status in ('to_ship', 'shipped'));

create index if not exists orders_fulfillment_status_paid_idx
  on public.orders (fulfillment_status, paid_at desc)
  where status = 'paid';
