-- Réconciliation périodique Stripe + retry des e-mails transactionnels.
-- Le jeton est généré dans Supabase Vault à l'application de la migration.

create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'doya_commerce_maintenance_token'
  ) then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'doya_commerce_maintenance_token',
      'Jeton interne du cron commerce DOYA'
    );
  end if;
end;
$$;

create or replace function public.verify_commerce_maintenance_token(p_token text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select p_token is not null
    and exists (
      select 1
      from vault.decrypted_secrets
      where name = 'doya_commerce_maintenance_token'
        and decrypted_secret = p_token
    );
$$;

revoke all on function public.verify_commerce_maintenance_token(text)
  from public, anon, authenticated;
grant execute on function public.verify_commerce_maintenance_token(text)
  to service_role;

do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'doya-commerce-maintenance'
  ) then
    perform cron.unschedule('doya-commerce-maintenance');
  end if;

  perform cron.schedule(
    'doya-commerce-maintenance',
    '*/10 * * * *',
    $cron$
      select net.http_post(
        url := 'https://ipphjddgeotsohplzkbo.supabase.co/functions/v1/commerce-maintenance',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-doya-maintenance-token',
          (select decrypted_secret
           from vault.decrypted_secrets
           where name = 'doya_commerce_maintenance_token')
        ),
        body := jsonb_build_object('source', 'cron'),
        timeout_milliseconds := 8000
      );
    $cron$
  );
exception
  when others then
    raise notice 'commerce maintenance cron schedule skipped: %', sqlerrm;
end;
$$;
