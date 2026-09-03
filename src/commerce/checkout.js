import { commerceConfigured, supabaseAnonKey, supabaseUrl } from './config.js'
import { supabase } from './supabase.js'

async function invoke(path, body) {
  if (!commerceConfigured || !supabase) throw new Error('commerce_disabled')
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token ?? supabaseAnonKey
  const response = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error ?? 'request_failed')
    error.status = response.status
    throw error
  }
  return payload
}

export function startCheckout({ items, email, promoCode }) {
  return invoke('create-checkout-session', { items, email, promoCode })
}

export function fetchOrder(sessionId) {
  return invoke('get-order', { sessionId })
}
