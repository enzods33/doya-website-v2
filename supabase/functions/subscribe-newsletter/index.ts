import { json, preflight, publicSiteUrl, rejectOrigin } from '../_shared/http.ts'
import { allowRatePersistent, clientIp, privateRateKey } from '../_shared/rateLimit.ts'
import { serviceClient } from '../_shared/clients.ts'
import { newsletterAddressHash } from '../_shared/newsletterUnsubscribe.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 8
const CONSENT_VERSION = '2026-10-02-v1'
const CONFIRM_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SOURCES = new Set(['footer', 'menu', 'cart'])
const LOCALES = new Set(['fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar'])

function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

function randomToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function setBrevoLang(apiKey: string, email: string, locale: string) {
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
    console.error('brevo_lang_update_failed', response.status)
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, await privateRateKey('newsletter:ip', clientIp(req)), RATE_MAX, RATE_WINDOW_MS))) {
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

  if (!(await allowRatePersistent(admin, await privateRateKey('newsletter:email', email), RATE_MAX, RATE_WINDOW_MS))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  const localeRaw = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : 'fr'
  const locale = LOCALES.has(localeRaw) ? localeRaw : 'fr'
  const sourceRaw = typeof body.source === 'string' ? body.source.trim().toLowerCase() : 'footer'
  const source = SOURCES.has(sourceRaw) ? sourceRaw : 'footer'

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  const doiTemplateId = Number(Deno.env.get('BREVO_DOI_TEMPLATE_ID') ?? '')
  const consentSecret = (Deno.env.get('BREVO_UNSUBSCRIBE_SECRET') ?? '').trim()
  if (!apiKey || !consentSecret || !Number.isInteger(listId) || listId < 1 || !Number.isInteger(doiTemplateId) || doiTemplateId < 1) {
    return json(503, { error: 'newsletter_unavailable' }, origin)
  }

  // Ne révèle jamais publiquement si l'adresse est déjà inscrite.
  const existingRes = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    headers: { accept: 'application/json', 'api-key': apiKey },
  })
  if (existingRes.ok) {
    const existing = await existingRes.json().catch(() => ({})) as { listIds?: number[] }
    const lists = Array.isArray(existing.listIds) ? existing.listIds : []
    if (lists.includes(listId)) {
      await setBrevoLang(apiKey, email, locale)
      return json(200, { ok: true }, origin)
    }
  }

  const token = randomToken()
  const [emailHash, tokenHash] = await Promise.all([
    newsletterAddressHash(email, consentSecret),
    sha256Hex(token),
  ])
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CONFIRM_TTL_MS)

  // Nettoyage opportuniste : aucune adresse non confirmée n'est conservée au-delà du TTL.
  await admin
    .from('newsletter_optins')
    .delete()
    .is('confirmed_at', null)
    .lt('expires_at', now.toISOString())

  const { error: proofError } = await admin
    .from('newsletter_optins')
    .upsert({
      email_hash: emailHash,
      pending_email: email,
      token_hash: tokenHash,
      source,
      locale,
      consent_version: CONSENT_VERSION,
      consent_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      confirmed_at: null,
      welcome_sent_at: null,
      unsubscribed_at: null,
      last_error: null,
      updated_at: now.toISOString(),
    }, { onConflict: 'email_hash' })

  if (proofError) {
    console.error('newsletter_consent_store_failed', proofError)
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  const redirect = `${publicSiteUrl()}/newsletter-confirmation?token=${encodeURIComponent(token)}`
  const doiRes = await fetch('https://api.brevo.com/v3/contacts/doubleOptinConfirmation', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      email,
      includeListIds: [listId],
      redirectionUrl: redirect,
      templateId: doiTemplateId,
      attributes: { LANG: locale },
    }),
  })

  if (!doiRes.ok) {
    const payload = await doiRes.json().catch(() => ({}))
    console.error('brevo_doi_failed', doiRes.status, payload)
    await admin
      .from('newsletter_optins')
      .update({ last_error: `brevo_doi_${doiRes.status}`, updated_at: new Date().toISOString() })
      .eq('email_hash', emailHash)
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  return json(200, { ok: true }, origin)
})
