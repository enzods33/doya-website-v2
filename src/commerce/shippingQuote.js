import { commerceConfigured, supabaseAnonKey, supabaseUrl } from './config.js'

export async function requestShippingQuote({
  email,
  message,
  shippingCountry,
  locale = 'fr',
  items,
  website = '',
}) {
  if (!commerceConfigured) throw new Error('commerce_disabled')
  const response = await fetch(`${supabaseUrl}/functions/v1/request-shipping-quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      email: String(email ?? '').trim(),
      message: String(message ?? '').trim(),
      shippingCountry: String(shippingCountry ?? '').trim(),
      locale: String(locale ?? 'fr'),
      items: Array.isArray(items) ? items : [],
      website: String(website ?? ''),
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error ?? 'quote_send_failed')
    error.status = response.status
    throw error
  }
  return payload
}
