import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { allowRatePersistent, clientIp, privateRateKey } from '../_shared/rateLimit.ts'
import { serviceClient } from '../_shared/clients.ts'
import { sendNewsletterWelcome } from '../_shared/newsletterWelcome.ts'

const TOKEN_RE = /^[A-Za-z0-9_-]{40,80}$/

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, await privateRateKey('newsletter-confirm:ip', clientIp(req)), 12, 10 * 60 * 1000))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  const body = await req.json().catch(() => ({})) as { token?: unknown }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!TOKEN_RE.test(token)) return json(400, { error: 'invalid_link' }, origin)

  const tokenHash = await sha256Hex(token)
  const { data: row, error: lookupError } = await admin
    .from('newsletter_optins')
    .select('id, pending_email, locale, expires_at, confirmed_at, welcome_sent_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (lookupError || !row) return json(400, { error: 'invalid_link' }, origin)
  if (row.welcome_sent_at) return json(200, { ok: true }, origin)
  if (Date.parse(row.expires_at) < Date.now()) return json(400, { error: 'invalid_link' }, origin)

  const email = typeof row.pending_email === 'string' ? row.pending_email.trim().toLowerCase() : ''
  if (!email) {
    if (row.confirmed_at) return json(200, { ok: true }, origin)
    return json(400, { error: 'invalid_link' }, origin)
  }

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  if (!apiKey || !Number.isInteger(listId) || listId < 1) {
    return json(503, { error: 'newsletter_unavailable' }, origin)
  }

  // Le clic Brevo doit avoir réellement ajouté le contact à la liste avant
  // que nous enregistrions la confirmation et envoyions le welcome.
  const contactRes = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    headers: { accept: 'application/json', 'api-key': apiKey },
  })
  const contact = contactRes.ok
    ? await contactRes.json().catch(() => ({})) as { listIds?: number[] }
    : {}
  if (!contactRes.ok || !Array.isArray(contact.listIds) || !contact.listIds.includes(listId)) {
    return json(409, { error: 'confirmation_pending' }, origin)
  }

  const confirmedAt = row.confirmed_at ?? new Date().toISOString()
  await admin
    .from('newsletter_optins')
    .update({ confirmed_at: confirmedAt, updated_at: new Date().toISOString() })
    .eq('id', row.id)

  // Décision produit : le welcome ne contient volontairement PAS de lien de
  // désabonnement. Les campagnes normales gardent leur lien signé.
  const welcomeSent = await sendNewsletterWelcome(email, row.locale, row.id)
  if (!welcomeSent) {
    await admin
      .from('newsletter_optins')
      .update({ last_error: 'brevo_welcome_failed', updated_at: new Date().toISOString() })
      .eq('id', row.id)
    // L'inscription est confirmée ; le cron retentera le welcome.
    return json(200, { ok: true }, origin)
  }

  await admin
    .from('newsletter_optins')
    .update({
      pending_email: null,
      welcome_sent_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)

  return json(200, { ok: true }, origin)
})
