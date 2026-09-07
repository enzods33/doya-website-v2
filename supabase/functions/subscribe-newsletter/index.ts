import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { emailLogoPublicUrl } from '../_shared/emailLogo.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { serviceClient } from '../_shared/clients.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Rate-limit : 8 req / 10 min / IP (Postgres + fallback mémoire). */
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 8

async function setBrevoLang(
  apiKey: string,
  email: string,
  locale: string,
  listIds?: number[],
) {
  const body: Record<string, unknown> = {
    attributes: { LANG: locale },
  }
  if (listIds?.length) body.listIds = listIds
  const response = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok && response.status !== 204) {
    const payload = await response.json().catch(() => ({}))
    console.error('brevo_lang_update_failed', response.status, payload)
    return false
  }
  return true
}

const WELCOME = {
  fr: {
    subject: 'Bienvenue dans le cercle DOYA',
    preview: 'Tu feras partie des premiers à recevoir les news.',
    title: 'Bienvenue',
    body: [
      'Merci pour ton inscription.',
      'Tu fais maintenant partie du cercle DOYA — et tu seras parmi les premiers à recevoir les dernières nouvelles : sorties, dates de concert, et petites surprises au fil de la route.',
      'À très vite,',
    ],
    sign: '— DOYA',
  },
  en: {
    subject: 'Welcome to the DOYA circle',
    preview: 'You’ll be among the first to get the news.',
    title: 'Welcome',
    body: [
      'Thanks for signing up.',
      'You’re now part of the DOYA circle — and you’ll be among the first to hear about releases, live dates, and the little surprises along the way.',
      'See you soon,',
    ],
    sign: '— DOYA',
  },
  es: {
    subject: 'Bienvenido/a al círculo DOYA',
    preview: 'Serás de los primeros en recibir las noticias.',
    title: 'Bienvenido/a',
    body: [
      'Gracias por tu inscripción.',
      'Ya formas parte del círculo DOYA — y serás de los primeros en recibir novedades: lanzamientos, fechas en vivo y pequeñas sorpresas en el camino.',
      'Hasta pronto,',
    ],
    sign: '— DOYA',
  },
  pt: {
    subject: 'Bem-vindo/a ao círculo DOYA',
    preview: 'Farás parte dos primeiros a receber as novidades.',
    title: 'Bem-vindo/a',
    body: [
      'Obrigado pela tua inscrição.',
      'Já fazes parte do círculo DOYA — e estarás entre os primeiros a receber novidades: lançamentos, datas ao vivo e pequenas surpresas pelo caminho.',
      'Até já,',
    ],
    sign: '— DOYA',
  },
} as const

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function welcomeHtml(locale: keyof typeof WELCOME, logoUrl: string) {
  const copy = WELCOME[locale] ?? WELCOME.fr
  const paragraphs = copy.body
    .map((line) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2c2926;">${escapeHtml(line)}</p>`)
    .join('')
  return `<!DOCTYPE html>
<html lang="${locale}"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e4ddd3;">
<tr><td align="center" style="padding:28px 28px 8px;">
<img src="${escapeHtml(logoUrl)}" width="168" height="150" alt="DOYA" style="display:block;margin:0 auto;border:0;width:168px;height:auto;max-width:55%;" />
</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 18px;font-family:Georgia,serif;font-size:22px;letter-spacing:.06em;text-transform:uppercase;color:#2c2926;">${escapeHtml(copy.title)}</p>
${paragraphs}
<p style="margin:24px 0 0;font-size:14px;letter-spacing:.04em;color:#2c2926;">${escapeHtml(copy.sign)}</p>
</td></tr></table></td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  if (!(await allowRatePersistent(serviceClient(), `newsletter:ip:${clientIp(req)}`, RATE_MAX, RATE_WINDOW_MS))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  let body: { email?: string; locale?: string; website?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  // Honeypot rempli → faux succès (ne pas tipper les bots).
  const website = typeof body.website === 'string' ? body.website.trim() : ''
  if (website) {
    return json(200, { ok: true, already: false }, origin)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) return json(400, { error: 'invalid_email' }, origin)

  const localeRaw = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : 'fr'
  const locale = (localeRaw in WELCOME ? localeRaw : 'fr') as keyof typeof WELCOME

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  const senderEmail = (Deno.env.get('BREVO_SENDER_EMAIL') ?? '').trim()
  const senderName = (Deno.env.get('BREVO_SENDER_NAME') ?? 'DOYA').trim() || 'DOYA'
  if (!apiKey || !Number.isInteger(listId) || listId < 1) {
    return json(503, { error: 'newsletter_unavailable' }, origin)
  }

  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  }

  // Déjà sur la liste → met à jour LANG (langue du site à cette visite) puis stop.
  const existingRes = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
    headers: { accept: 'application/json', 'api-key': apiKey },
  })
  if (existingRes.ok) {
    const existing = await existingRes.json().catch(() => ({})) as { listIds?: number[] }
    const lists = Array.isArray(existing.listIds) ? existing.listIds : []
    if (lists.includes(listId)) {
      await setBrevoLang(apiKey, email, locale)
      return json(200, { ok: true, already: true }, origin)
    }
  }

  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      listIds: [listId],
      updateEnabled: true,
      attributes: { LANG: locale },
    }),
  })

  if (!(response.ok || response.status === 204)) {
    let payload: { code?: string; message?: string } = {}
    try {
      payload = await response.json()
    } catch {
      payload = {}
    }
    const duplicate = payload.code === 'duplicate_parameter'
      || /already exists|duplicate/i.test(payload.message ?? '')
    if (duplicate) {
      await setBrevoLang(apiKey, email, locale, [listId])
      return json(200, { ok: true, already: true }, origin)
    }

    console.error('brevo_subscribe_failed', response.status, payload)
    return json(502, { error: 'newsletter_failed' }, origin)
  }

  // Sécurise LANG même si le POST a réussi sans attribut (rare).
  await setBrevoLang(apiKey, email, locale)

  // Mail de bienvenue automatique (nouveaux inscrits seulement).
  if (senderEmail) {
    const copy = WELCOME[locale]
    const welcomeRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email }],
        subject: copy.subject,
        htmlContent: welcomeHtml(locale, emailLogoPublicUrl()),
        previewText: copy.preview,
      }),
    })
    if (!welcomeRes.ok) {
      const welcomePayload = await welcomeRes.json().catch(() => ({}))
      console.error('brevo_welcome_failed', welcomePayload)
    }
  }

  return json(200, { ok: true, already: false }, origin)
})
