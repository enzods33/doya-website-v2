import { json, preflight, publicSiteUrl, rejectOrigin } from '../_shared/http.ts'
import { emailLogoPublicUrl } from '../_shared/emailLogo.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { serviceClient } from '../_shared/clients.ts'
import { CONFIRMATION_COPY, confirmationEmailHtml } from '../_shared/newsletterConfirm.ts'
import { normalizeNewsletterLocale } from '../_shared/newsletterWelcome.ts'
import { newNewsletterToken, newsletterTokenHash } from '../_shared/newsletterTokens.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 8
const CONSENT_VERSION = '2026-10-02'
const SOURCES = new Set(['footer', 'menu', 'cart', 'quote'])

async function setBrevoLang(
  apiKey: string,
  email: string,
  locale: string,
) {
  const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({ attributes: { LANG: locale } }),
  })
  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => ({}))
    console.error('brevo_lang_update_failed', response.status, payload)
    return false
  }
  return true
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, `newsletter:ip:${clientIp(req)}`, RATE_MAX, RATE_WINDOW_MS))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  let body: { email?: string; locale?: string; website?: string; source?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const website = typeof body.website === 'string' ? body.website.trim() : ''
  if (website) return json(200, { ok: true }, origin)

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) return json(400, { error: 'invalid_email' }, origin)

  if (!(await allowRatePersistent(admin, `newsletter:email:${email}`, RATE_MAX, RATE_WINDOW_MS))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  const locale = normalizeNewsletterLocale(body.locale)
  const rawSource = typeof body.source === 'string' ? body.source.trim().toLowerCase() : 'footer'
  const source = SOURCES.has(rawSource) ? rawSource : 'footer'

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  const senderEmail = (Deno.env.get('BREVO_SENDER_EMAIL') ?? '').trim()
  const senderName = (Deno.env.get('BREVO_SENDER_NAME') ?? 'DOYA').trim() || 'DOYA'
  if (!apiKey || !Number.isInteger(listId) || listId < 1 || !senderEmail) {
    return json(503, { error: 'newsletter_unavailable' }, origin)
  }

  // Réponse publique volontairement identique pour une adresse déjà inscrite.
  const existingRes = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    headers: { accept: 'application/json', 'api-key': apiKey },
  })
  if (existingRes.ok) {
    const existing = await existingRes.json().catch(() => ({})) as { listIds?: number[] }
    const lists = Array.isArray(existing.listIds) ? existing.listIds : []
    if (lists.includes(listId)) {
      await setBrevoLang(apiKey, email, locale)
      await admin.from('newsletter_consents').insert({
        email,
        locale,
        source,
        consent_version: CONSENT_VERSION,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      return json(200, { ok: true }, origin)
    }
  }

  const token = newNewsletterToken()
  const tokenHash = await newsletterTokenHash(token)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { data: consent, error: consentError } = await admin
    .from('newsletter_consents')
    .insert({
      email,
      locale,
      source,
      consent_version: CONSENT_VERSION,
      status: 'pending',
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select('id')
    .maybeSingle()

  if (consentError || !consent?.id) {
    console.error('newsletter_consent_insert_failed', consentError)
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  const confirmUrl = `${publicSiteUrl()}/confirmation-newsletter?token=${encodeURIComponent(token)}`
  const copy = CONFIRMATION_COPY[locale]
  const confirmRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: copy.subject,
      htmlContent: confirmationEmailHtml(locale, confirmUrl, emailLogoPublicUrl()),
      previewText: copy.preview,
    }),
  })

  if (!confirmRes.ok) {
    const payload = await confirmRes.json().catch(() => ({}))
    console.error('brevo_optin_email_failed', confirmRes.status, payload)
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  return json(200, { ok: true }, origin)
})
