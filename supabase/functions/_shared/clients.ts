import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'
import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'

export function stripeClient() {
  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key || !key.startsWith('sk_')) throw new Error('stripe_secret_missing')
  return new Stripe(key, { apiVersion: '2024-11-20.acacia', httpClient: Stripe.createFetchHttpClient() })
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('supabase_service_missing')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${key}`, apikey: key } },
  })
}

export function userClient(accessToken: string) {
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('supabase_anon_missing')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function shippingCents() {
  const raw = Deno.env.get('SHIPPING_CENTS')
  if (raw === undefined || raw === '') throw new Error('shipping_not_configured')
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 0 || value > 50000) throw new Error('shipping_invalid')
  return value
}

