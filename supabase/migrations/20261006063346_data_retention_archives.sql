-- Private snapshots of completed sales. Operational paid orders are preserved.
create schema if not exists doya_private;
revoke all on schema doya_private from public, anon, authenticated;

create table if not exists doya_private.order_archives (
  id bigint generated always as identity primary key,
  order_id uuid not null,
  snapshot_hash text not null check (length(snapshot_hash) = 64),
  snapshot jsonb not null,
  archived_at timestamptz not null default now(),
  accounting_year_closed_at date,
  delivery_confirmed_at timestamptz,
  contractual_end_at timestamptz,
  legal_hold boolean not null default false,
  unique (order_id, snapshot_hash)
);
alter table doya_private.order_archives enable row level security;
revoke all on doya_private.order_archives from public, anon, authenticated;

create or replace function public.archive_completed_orders(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
  missing_dates integer;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'invalid_archive_limit';
  end if;
  with snapshots as (
    select o.id as order_id,
      jsonb_build_object(
        'order', to_jsonb(o),
        'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.id)
          from public.order_items i where i.order_id = o.id), '[]'::jsonb),
        'accepted_terms_version', o.terms_version,
        'accepted_terms_document_verified', false
      ) as snapshot
    from public.orders o
    where o.status in ('paid', 'refunded')
      and (o.fulfillment_status = 'shipped' or o.status = 'refunded')
  ), hashed as (
    select order_id, snapshot,
      encode(extensions.digest(snapshot::text, 'sha256'), 'hex') as snapshot_hash
    from snapshots
  ), missing as (
    select h.* from hashed h
    where not exists (
      select 1 from doya_private.order_archives a
      where a.order_id = h.order_id and a.snapshot_hash = h.snapshot_hash
    )
    order by h.order_id limit p_limit
  )
  insert into doya_private.order_archives(order_id, snapshot_hash, snapshot)
  select order_id, snapshot_hash, snapshot from missing
  on conflict(order_id, snapshot_hash) do nothing;
  get diagnostics inserted_count = row_count;

  select count(*) into missing_dates from doya_private.order_archives
  where accounting_year_closed_at is null or delivery_confirmed_at is null;
  return jsonb_build_object(
    'failed', 0, 'createdSnapshots', inserted_count,
    'snapshotsAwaitingVerifiedDates', missing_dates,
    'paidOrdersDeleted', 0,
    'acceptedTermsDocuments', 'verification_required'
  );
end;
$$;
revoke all on function public.archive_completed_orders(integer) from public, anon, authenticated;
grant execute on function public.archive_completed_orders(integer) to service_role;

-- Enable the authorized retention mode through the authenticated cron body.
-- No secret value is embedded in this migration or returned to callers.
do $$
declare
  current_command text;
  updated_command text;
  maintenance_id bigint;
begin
  select jobid, command into maintenance_id, current_command
  from cron.job where jobname = 'doya-commerce-maintenance';
  if maintenance_id is null then raise exception 'commerce_maintenance_missing'; end if;
  updated_command := replace(current_command,
    'jsonb_build_object(''source'', ''cron'')',
    'jsonb_build_object(''source'', ''cron'', ''retentionApply'', true)');
  updated_command := replace(updated_command, 'timeout_milliseconds := 8000', 'timeout_milliseconds := 30000');
  if updated_command = current_command and position('retentionApply' in current_command) = 0 then
    raise exception 'unexpected_maintenance_command';
  end if;
  perform cron.alter_job(maintenance_id, command := updated_command);
  perform cron.schedule('doya-data-retention-review', '15 3 * * *', $cron$
    select net.http_post(
      url := 'https://ipphjddgeotsohplzkbo.supabase.co/functions/v1/commerce-maintenance',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-doya-maintenance-token', (select decrypted_secret from vault.decrypted_secrets
          where name = 'doya_commerce_maintenance_token')),
      body := jsonb_build_object('source', 'retention_review', 'retentionApply', true,
        'brevoAudit', true, 'archiveOrders', true),
      timeout_milliseconds := 60000
    );
  $cron$);
end;
$$;
