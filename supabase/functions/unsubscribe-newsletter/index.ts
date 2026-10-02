import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { serviceClient } from '../_shared/clients.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { verifyNewsletterAddress } from '../_shared/newsletterUnsubscribe.ts'
import { newsletterSigningSecret } from '../_shared/newsletterSigning.ts'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)
  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, `unsubscribe:ip:${clientIp(req)}`, 12, 10 * 60 * 1000))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  const secret = await newsletterSigningSecret(admin)
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  if (!apiKey || !Number.isInteger(listId) || listId < 1) return json(503, { error: 'newsletter_unavailable' }, origin)

  const body = await req.json().catch(() => ({})) as { token?: unknown }
  const token = typeof body.token === 'string' ? body.token : ''
  let email = await verifyNewsletterAddress(token, secret)

  // Compatibilité des liens déjà envoyés avant la clé dédiée. Aucun nouveau
  // lien n'est signé avec la clé Brevo ; ce fallback ne sert qu'à l'historique.
  if (!email) {
    const legacySecret = Deno.env.get('BREVO_UNSUBSCRIBE_SECRET') || apiKey
    if (legacySecret && legacySecret !== secret) {
      email = await verifyNewsletterAddress(token, legacySecret)
    }
  }
  if (!email) return json(400, { error: 'invalid_link' }, origin)

  const response = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}/contacts/remove`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ emails: [email] }),
  })
  if (!response.ok) {
    console.error('brevo_unsubscribe_failed', response.status)
    return json(502, { error: 'newsletter_failed' }, origin)
  }
  const result = await response.json().catch(() => ({})) as { contacts?: { failed?: unknown[] } }
  if (Array.isArray(result.contacts?.failed) && result.contacts.failed.length) {
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  const now = new Date().toISOString()
  const { error: consentError } = await admin
    .from('newsletter_consents')
    .update({ status: 'unsubscribed', unsubscribed_at: now })
    .eq('email', email)
    .eq('status', 'confirmed')
  if (consentError) console.error('newsletter_consent_unsubscribe_failed', consentError)

  return json(200, { ok: true }, origin)
})
