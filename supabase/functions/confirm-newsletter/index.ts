import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { emailLogoPublicUrl } from '../_shared/emailLogo.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { serviceClient } from '../_shared/clients.ts'

const TOKEN_RE = /^[A-Za-z0-9_-]{40,80}$/

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
  de: {
    subject: 'Willkommen im DOYA-Kreis',
    preview: 'Du erfährst Neuigkeiten mit als Erste/r.',
    title: 'Willkommen',
    body: [
      'Danke für deine Anmeldung.',
      'Du bist jetzt Teil des DOYA-Kreises — und erfährst als eine/r der Ersten von neuen Veröffentlichungen, Live-Terminen und kleinen Überraschungen unterwegs.',
      'Bis bald,',
    ],
    sign: '— DOYA',
  },
  ja: {
    subject: 'DOYAのサークルへようこそ',
    preview: '最新情報をいち早くお届けします。',
    title: 'ようこそ',
    body: [
      'ご登録ありがとうございます。',
      'DOYAのサークルへようこそ。リリース、ライブ日程、そして旅の途中の小さなサプライズなど、最新情報をいち早くお届けします。',
      'またすぐに、',
    ],
    sign: '— DOYA',
  },
  ko: {
    subject: 'DOYA 서클에 오신 것을 환영합니다',
    preview: '새로운 소식을 가장 먼저 받아보세요.',
    title: '환영합니다',
    body: [
      '구독해 주셔서 감사합니다.',
      '이제 DOYA 서클의 일원입니다. 새 음원, 라이브 일정, 그리고 여정 속 작은 소식들을 가장 먼저 받아보실 수 있습니다.',
      '곧 다시 만나요,',
    ],
    sign: '— DOYA',
  },
  zh: {
    subject: '欢迎加入 DOYA',
    preview: '第一时间收到 DOYA 的最新消息。',
    title: '欢迎',
    body: [
      '感谢你的订阅。',
      '你现在已经加入 DOYA。新作品、现场演出日期，以及旅途中那些小小的惊喜，我们都会尽早与你分享。',
      '很快再见，',
    ],
    sign: '— DOYA',
  },
  ar: {
    subject: 'مرحبًا بك في دائرة DOYA',
    preview: 'ستكون من أوائل من يتلقون أخبار DOYA.',
    title: 'مرحبًا',
    body: [
      'شكرًا لاشتراكك.',
      'أصبحت الآن جزءًا من دائرة DOYA، وستكون من أوائل من يتلقون أخبار الإصدارات ومواعيد الحفلات والمفاجآت الصغيرة على طول الطريق.',
      'نلتقي قريبًا،',
    ],
    sign: '— DOYA',
  },
} as const

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function welcomeHtml(locale: keyof typeof WELCOME, logoUrl: string) {
  const copy = WELCOME[locale] ?? WELCOME.fr
  const rtl = locale === 'ar'
  const dir = rtl ? 'rtl' : 'ltr'
  const align = rtl ? 'right' : 'left'
  const paragraphs = copy.body
    .map((line) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2c2926;">${escapeHtml(line)}</p>`)
    .join('')
  return `<!DOCTYPE html>
<html lang="${locale === 'zh' ? 'zh-CN' : locale}" dir="${dir}"><head><meta charset="utf-8"></head>
<body dir="${dir}" style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" dir="${dir}" style="max-width:560px;background:#ffffff;border:1px solid #e4ddd3;text-align:${align};">
<tr><td align="center" style="padding:28px 28px 8px;">
<img src="${escapeHtml(logoUrl)}" width="168" height="150" alt="DOYA" style="display:block;margin:0 auto;border:0;width:168px;height:auto;max-width:55%;" />
</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Arial,Tahoma,sans-serif;">
<p style="margin:0 0 18px;font-size:22px;${rtl ? 'letter-spacing:0;text-transform:none;' : 'letter-spacing:.06em;text-transform:uppercase;'}color:#2c2926;">${escapeHtml(copy.title)}</p>
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

  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, `newsletter-confirm:ip:${clientIp(req)}`, 12, 10 * 60 * 1000))) {
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
  const senderEmail = (Deno.env.get('BREVO_SENDER_EMAIL') ?? '').trim()
  const senderName = (Deno.env.get('BREVO_SENDER_NAME') ?? 'DOYA').trim() || 'DOYA'
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
  if (!senderEmail) {
    await admin
      .from('newsletter_optins')
      .update({ last_error: 'brevo_sender_missing', updated_at: new Date().toISOString() })
      .eq('id', row.id)
    return json(200, { ok: true }, origin)
  }

  const locale = (row.locale in WELCOME ? row.locale : 'fr') as keyof typeof WELCOME
  const copy = WELCOME[locale]
  const welcomeRes = await fetch('https://api.brevo.com/v3/smtp/email', {
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
      htmlContent: welcomeHtml(locale, emailLogoPublicUrl()),
      previewText: copy.preview,
      headers: { idempotencyKey: row.id },
    }),
  })

  if (!welcomeRes.ok) {
    const payload = await welcomeRes.json().catch(() => ({}))
    console.error('brevo_welcome_failed', payload)
    await admin
      .from('newsletter_optins')
      .update({ last_error: `brevo_welcome_${welcomeRes.status}`, updated_at: new Date().toISOString() })
      .eq('id', row.id)
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
