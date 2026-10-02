import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { serviceClient } from '../_shared/clients.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { verifyNewsletterAddress } from '../_shared/newsletterUnsubscribe.ts'
import { hashNewsletterToken } from '../_shared/newsletterTokens.ts'

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

  const apiKey = (Deno.env.get('BREVO_API_KEY') ?? '').trim()
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  if (!apiKey || !Number.isInteger(listId) || listId < 1) {
    return json(503, { error: 'newsletter_unavailable' }, origin)
  }

  const body = await req.json().catch(() => ({})) as { token?: unknown }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  let email: string | null = null
  let opaqueHash = ''

  // Nouveaux liens : token aléatoire opaque, seule son empreinte est stockée.
  if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
    opaqueHash = await hashNewsletterToken(token)
    const { data: opaque, error } = await admin
      .from('newsletter_unsubscribe_tokens')
      .select('email, used_at')
      .eq('token_hash', opaqueHash)
      .maybeSingle()

    if (!error && opaque?.email) {
      if (opaque.used_at) return json(200, { ok: true }, origin)
      email = String(opaque.email).trim().toLowerCase()
    }
  }

  // Compatibilité uniquement pour les liens HMAC déjà envoyés avant ce déploiement.
  if (!email) {
    const legacySecret = Deno.env.get('BREVO_UNSUBSCRIBE_SECRET') || apiKey
    email = await verifyNewsletterAddress(token, legacySecret)
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
    console.error('brevo_unsubscribe_partial_failure', result.contacts.failed.length)
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  const now = new Date().toISOString()
  if (opaqueHash) {
    const { error } = await admin
      .from('newsletter_unsubscribe_tokens')
      .update({ used_at: now })
      .eq('token_hash', opaqueHash)
    if (error) console.error('newsletter_unsubscribe_token_mark_failed', error)
  }

  const { error: consentError } = await admin
    .from('newsletter_consents')
    .update({ status: 'unsubscribed', unsubscribed_at: now })
    .eq('email', email)
    .eq('status', 'confirmed')
  if (consentError) console.error('newsletter_consent_unsubscribe_failed', consentError)

  return json(200, { ok: true }, origin)
})
