-- Verrouille EXECUTE des RPC SECURITY DEFINER.
-- Les default privileges Supabase re-accordent anon/authenticated après
-- chaque CREATE OR REPLACE — revoker explicitement après chaque redefine.

do $$ begin
  alter default privileges for role postgres in schema public
    revoke execute on functions from public, anon, authenticated;
exception when insufficient_privilege then
  raise notice 'skip default privileges postgres';
end $$;

revoke all on function public.release_reservation(uuid) from public, anon, authenticated;
revoke all on function public.commit_reservation(uuid) from public, anon, authenticated;
revoke all on function public.create_pending_order(text, uuid, jsonb, text, integer) from public, anon, authenticated;
revoke all on function public.release_stale_reservations() from public, anon, authenticated;
revoke all on function public.attach_stripe_session(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_stripe_event(text, text) from public, anon, authenticated;
revoke all on function public.prune_concerts_window() from public, anon, authenticated;

grant execute on function public.release_reservation(uuid) to service_role;
grant execute on function public.commit_reservation(uuid) to service_role;
grant execute on function public.create_pending_order(text, uuid, jsonb, text, integer) to service_role;
grant execute on function public.release_stale_reservations() to service_role;
grant execute on function public.attach_stripe_session(uuid, text) to service_role;
grant execute on function public.mark_order_paid_from_stripe(uuid, text, text, jsonb) to service_role;
grant execute on function public.record_stripe_event(text, text) to service_role;
grant execute on function public.prune_concerts_window() to postgres, service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.claim_orders() from public, anon;
grant execute on function public.claim_orders() to authenticated, service_role;

-- Event trigger platform (pas d'appel RPC)
do $$ begin
  revoke all on function public.rls_auto_enable() from public, anon, authenticated;
exception when undefined_function then
  null;
end $$;
