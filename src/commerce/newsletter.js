import { commerceConfigured, supabaseAnonKey, supabaseUrl } from './config.js'

export async function subscribeNewsletter(email, locale = 'fr') {
  if (!commerceConfigured) throw new Error('commerce_disabled')
  const response = await fetch(`${supabaseUrl}/functions/v1/subscribe-newsletter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      email: String(email ?? '').trim(),
      locale: String(locale ?? 'fr'),
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error ?? 'newsletter_failed')
    error.status = response.status
    throw error
  }
  return payload
}
