import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { emailLogoPublicUrl } from '../_shared/emailLogo.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { serviceClient } from '../_shared/clients.ts'
import { newsletterTokenHash } from '../_shared/newsletterTokens.ts'
import { normalizeNewsletterLocale, welcomeHtml, WELCOME } from '../_shared/newsletterWelcome.ts'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, `newsletter-confirm:ip:${clientIp(req)}`, 20, 10 * 60 * 1000))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  const body = await req.json().catch(() => ({})) as { token?: unknown }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return json(400, { error: 'invalid_link' }, origin)

  const tokenHash = await newsletterTokenHash(token)
  const { data: consent, error } = await admin
    .from('newsletter_consents')
    .select('id, email, locale, status, expires_at, confirmed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (error || !consent) return json(400, { error: 'invalid_link' }, origin)
  if (consent.status === 'confirmed') return json(200, { ok: true }, origin)
  if (
    consent.status !== 'pending'
    || !consent.expires_at
    || Date.parse(consent.expires_at) <= Date.now()
  ) {
    return json(400, { error: 'invalid_link' }, origin)
  }

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  const senderEmail = (Deno.env.get('BREVO_SENDER_EMAIL') ?? '').trim()
  const senderName = (Deno.env.get('BREVO_SENDER_NAME') ?? 'DOYA').trim() || 'DOYA'
  if (!apiKey || !Number.isInteger(listId) || listId < 1) {
    return json(503, { error: 'newsletter_unavailable' }, origin)
  }

  const locale = normalizeNewsletterLocale(consent.locale)
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  }

  const create = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: consent.email,
      listIds: [listId],
      updateEnabled: true,
      attributes: { LANG: locale },
    }),
  })

  if (!(create.ok || create.status === 204)) {
    const payload = await create.json().catch(() => ({})) as { code?: string; message?: string }
    const duplicate = payload.code === 'duplicate_parameter'
      || /already exists|duplicate/i.test(payload.message ?? '')
    if (!duplicate) {
      console.error('brevo_confirm_contact_failed', create.status, payload)
      return json(502, { error: 'newsletter_failed' }, origin)
    }

    const update = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(consent.email)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ listIds: [listId], attributes: { LANG: locale } }),
    })
    if (!update.ok && update.status !== 204) {
      console.error('brevo_confirm_update_failed', update.status)
      return json(502, { error: 'newsletter_failed' }, origin)
    }
  }

  const confirmedAt = new Date().toISOString()
  const { error: confirmError } = await admin
    .from('newsletter_consents')
    .update({ status: 'confirmed', confirmed_at: confirmedAt })
    .eq('id', consent.id)
    .eq('status', 'pending')

  if (confirmError) {
    console.error('newsletter_consent_confirm_failed', confirmError)
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  // Mail de bienvenue uniquement après confirmation. Comme demandé, il ne
  // contient pas de lien de désabonnement ; les campagnes suivantes en ont un.
  if (senderEmail) {
    const copy = WELCOME[locale]
    const welcomeRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: consent.email }],
        subject: copy.subject,
        htmlContent: welcomeHtml(locale, emailLogoPublicUrl()),
        previewText: copy.preview,
      }),
    })
    if (!welcomeRes.ok) {
      const payload = await welcomeRes.json().catch(() => ({}))
      console.error('brevo_welcome_failed', payload)
    }
  }

  return json(200, { ok: true }, origin)
})
