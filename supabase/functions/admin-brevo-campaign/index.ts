import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { serviceClient } from '../_shared/clients.ts'
import { emailLogoPublicUrl, rewriteEmailLogoSrc } from '../_shared/emailLogo.ts'

type CampaignBody = {
  action?: string
  name?: string
  subject?: string
  previewText?: string
  htmlContent?: string
  bodyText?: string
  signature?: string
  logoBase?: string
  logoUrl?: string
  email?: string
  campaignId?: number | string
  scheduledAt?: string | null
  /** fr | es | pt | en | all — filtre destinataires via attribut Brevo LANG */
  lang?: string
}

const NEWSLETTER_LANGS = new Set(['fr', 'es', 'pt', 'en'])

function normalizeSendLang(raw: unknown): string {
  const value = String(raw ?? 'all').trim().toLowerCase()
  if (value === 'all' || value === '') return 'all'
  return NEWSLETTER_LANGS.has(value) ? value : 'all'
}

function contactLang(attributes: Record<string, unknown> | undefined | null): string {
  const raw = attributes?.LANG ?? attributes?.LANGUAGE ?? attributes?.locale
  const value = String(raw ?? '').trim().toLowerCase()
  if (NEWSLETTER_LANGS.has(value)) return value
  return 'fr'
}

type NewsletterRow = {
  id: string
  subject: string
  name: string
  preview_text: string
  html_content?: string
  mode: string
  status: string
  sent_count: number
  brevo_campaign_id: number | null
  scheduled_at: string | null
  sent_at: string
  created_at: string
}

function mapNewsletterRow(row: NewsletterRow, withHtml = false) {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    previewText: row.preview_text,
    status: row.status,
    tag: row.mode === 'send' ? 'doya-immediate' : '',
    sentDate: row.sent_at,
    scheduledAt: row.scheduled_at,
    createdAt: row.created_at,
    sentCount: row.sent_count,
    ...(withHtml ? { htmlContent: row.html_content ?? '' } : {}),
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatMultiline(value: string) {
  return escapeHtml(value.trim()).replace(/\n/g, '<br>')
}

function brandHeaderHtml(logoSrc: string) {
  return `<img src="${escapeHtml(logoSrc)}" width="168" height="150" alt="DOYA" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:168px;height:auto;max-width:55%;" />`
}

function buildNewsletterHtml(bodyText: string, signatureRaw = '— DOYA', logoSrc: string) {
  const signature = signatureRaw.trim() || '— DOYA'
  const trimmed = bodyText.trim()
  const blocks = trimmed
    ? trimmed.split(/\n\s*\n/).map((block) => {
      const lines = escapeHtml(block.trim()).replace(/\n/g, '<br>')
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2c2926;">${lines}</p>`
    })
    : []
  if (!blocks.length) return ''
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e4ddd3;">
<tr><td align="center" style="padding:28px 28px 8px;">${brandHeaderHtml(logoSrc)}</td></tr>
<tr><td style="padding:12px 28px 28px;font-family:Helvetica,Arial,sans-serif;">
${blocks.join('\n')}
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;letter-spacing:.04em;color:#2c2926;">${formatMultiline(signature)}</p>
</td></tr></table></td></tr></table></body></html>`
}

function brevoHeaders(apiKey: string) {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': apiKey,
  }
}

async function fetchListEmails(
  apiKey: string,
  listId: number,
  langFilter: string = 'all',
): Promise<string[]> {
  const emails: string[] = []
  let offset = 0
  const limit = 50
  for (;;) {
    const response = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`,
      { headers: { accept: 'application/json', 'api-key': apiKey } },
    )
    const payload = await response.json().catch(() => ({})) as {
      contacts?: { email?: string; attributes?: Record<string, unknown> }[]
      count?: number
    }
    if (!response.ok) {
      console.error('brevo_list_contacts_failed', payload)
      throw new Error('brevo_list_contacts_failed')
    }
    const batch = Array.isArray(payload.contacts) ? payload.contacts : []
    for (const contact of batch) {
      const email = typeof contact.email === 'string' ? contact.email.trim().toLowerCase() : ''
      if (!email) continue
      if (langFilter !== 'all' && contactLang(contact.attributes) !== langFilter) continue
      emails.push(email)
    }
    offset += batch.length
    if (batch.length < limit) break
    if (emails.length >= 500) break
  }
  return [...new Set(emails)]
}

/** Compteurs par langue (attribut Brevo LANG). Sans LANG → fr. */
async function fetchLangStats(apiKey: string, listId: number) {
  const stats = { fr: 0, es: 0, pt: 0, en: 0, total: 0 }
  let offset = 0
  const limit = 50
  for (;;) {
    const response = await fetch(
      `https://api.brevo.com/v3/contacts/lists/${listId}/contacts?limit=${limit}&offset=${offset}`,
      { headers: { accept: 'application/json', 'api-key': apiKey } },
    )
    const payload = await response.json().catch(() => ({})) as {
      contacts?: { email?: string; attributes?: Record<string, unknown> }[]
    }
    if (!response.ok) {
      console.error('brevo_lang_stats_failed', payload)
      throw new Error('brevo_lang_stats_failed')
    }
    const batch = Array.isArray(payload.contacts) ? payload.contacts : []
    for (const contact of batch) {
      const email = typeof contact.email === 'string' ? contact.email.trim() : ''
      if (!email) continue
      const lang = contactLang(contact.attributes) as keyof typeof stats
      if (lang in stats && lang !== 'total') stats[lang] += 1
      stats.total += 1
    }
    offset += batch.length
    if (batch.length < limit) break
    if (stats.total >= 2000) break
  }
  return stats
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  let body: CampaignBody
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const apiKey = Deno.env.get('BREVO_API_KEY') ?? ''
  const listId = Number(Deno.env.get('BREVO_LIST_ID') ?? '')
  const senderEmail = (Deno.env.get('BREVO_SENDER_EMAIL') ?? '').trim()
  const senderName = (Deno.env.get('BREVO_SENDER_NAME') ?? 'DOYA').trim() || 'DOYA'
  if (!apiKey || !Number.isInteger(listId) || listId < 1) {
    return json(503, { error: 'newsletter_unavailable' }, origin)
  }

  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'list' || action === 'subscribers') {
    const listRes = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}`, {
      headers: { accept: 'application/json', 'api-key': apiKey },
    })
    const listPayload = await listRes.json().catch(() => ({})) as {
      uniqueSubscribers?: number
      totalSubscribers?: number
      name?: string
    }
    if (!listRes.ok) {
      console.error('brevo_list_meta_failed', listPayload)
      return json(502, { error: 'brevo_list_failed' }, origin)
    }
    const subscribers = Number(listPayload.uniqueSubscribers ?? listPayload.totalSubscribers ?? 0)
    let langStats = { fr: 0, es: 0, pt: 0, en: 0, total: subscribers }
    try {
      langStats = await fetchLangStats(apiKey, listId)
    } catch {
      /* total Brevo reste dispo même si le détail LANG échoue */
    }

    if (action === 'subscribers') {
      return json(200, {
        listId,
        listName: listPayload.name ?? null,
        subscribers: langStats.total || subscribers,
        langStats,
      }, origin)
    }

    const db = serviceClient()
    const { data: rows, error: listError } = await db
      .from('newsletter_messages')
      .select('id, subject, name, preview_text, mode, status, sent_count, brevo_campaign_id, scheduled_at, sent_at, created_at')
      .order('sent_at', { ascending: false })
      .limit(50)

    if (listError) {
      console.error('newsletter_list_failed', listError)
      return json(502, { error: 'newsletter_list_failed' }, origin)
    }

    return json(200, {
      campaigns: ((rows as NewsletterRow[] | null) ?? []).map((row) => mapNewsletterRow(row)),
      subscribers: langStats.total || subscribers,
      langStats,
      listId,
    }, origin)
  }

  if (action === 'get') {
    const rawId = body.campaignId
    const db = serviceClient()

    if (typeof rawId === 'string' && /^[0-9a-f-]{36}$/i.test(rawId)) {
      const { data: row, error } = await db
        .from('newsletter_messages')
        .select('id, subject, name, preview_text, html_content, mode, status, sent_count, brevo_campaign_id, scheduled_at, sent_at, created_at')
        .eq('id', rawId)
        .maybeSingle()
      if (error || !row) {
        console.error('newsletter_get_failed', error)
        return json(404, { error: 'campaign_not_found' }, origin)
      }
      return json(200, { campaign: mapNewsletterRow(row as NewsletterRow, true) }, origin)
    }

    const campaignId = Number(rawId)
    if (!Number.isInteger(campaignId) || campaignId < 1) {
      return json(400, { error: 'invalid_campaign' }, origin)
    }

    const { data: byBrevo } = await db
      .from('newsletter_messages')
      .select('id, subject, name, preview_text, html_content, mode, status, sent_count, brevo_campaign_id, scheduled_at, sent_at, created_at')
      .eq('brevo_campaign_id', campaignId)
      .maybeSingle()
    if (byBrevo) {
      return json(200, { campaign: mapNewsletterRow(byBrevo as NewsletterRow, true) }, origin)
    }

    const response = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaignId}`, {
      headers: { accept: 'application/json', 'api-key': apiKey },
    })
    const payload = await response.json().catch(() => ({})) as {
      id?: number
      name?: string
      subject?: string
      previewText?: string
      htmlContent?: string
      status?: string
      tag?: string
      sentDate?: string
      scheduledAt?: string
      createdAt?: string
    }
    if (!response.ok) {
      console.error('brevo_get_failed', payload)
      return json(502, { error: 'brevo_get_failed' }, origin)
    }
    return json(200, {
      campaign: {
        id: payload.id ?? campaignId,
        name: payload.name ?? '',
        subject: payload.subject ?? '',
        previewText: payload.previewText ?? '',
        htmlContent: payload.htmlContent ?? '',
        status: payload.status ?? '',
        tag: payload.tag ?? '',
        sentDate: payload.sentDate ?? null,
        scheduledAt: payload.scheduledAt ?? null,
        createdAt: payload.createdAt ?? null,
      },
    }, origin)
  }

  if (action === 'remove_contact') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) return json(400, { error: 'invalid_email' }, origin)
    const del = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { accept: 'application/json', 'api-key': apiKey },
    })
    if (!del.ok && del.status !== 404) {
      const payload = await del.json().catch(() => ({}))
      console.error('brevo_delete_contact_failed', payload)
      return json(502, { error: 'brevo_delete_contact_failed' }, origin)
    }
    return json(200, { ok: true, removed: email }, origin)
  }

  if (action === 'purge_campaigns') {
    const response = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=50&sort=desc', {
      headers: brevoHeaders(apiKey),
    })
    const payload = await response.json().catch(() => ({})) as { campaigns?: { id?: number }[] }
    if (!response.ok) {
      console.error('brevo_list_failed', payload)
      return json(502, { error: 'brevo_list_failed' }, origin)
    }
    const campaigns = Array.isArray(payload.campaigns) ? payload.campaigns : []
    let deleted = 0
    for (const campaign of campaigns) {
      if (!campaign?.id) continue
      const del = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json', 'api-key': apiKey },
      })
      if (del.ok || del.status === 204 || del.status === 404) deleted += 1
      else console.error('brevo_delete_campaign_failed', campaign.id, await del.text().catch(() => ''))
    }
    return json(200, { ok: true, deleted }, origin)
  }

  if (action === 'cleanup_tests') {
    const email = 'stephanedasil@gmail.com'
    await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { accept: 'application/json', 'api-key': apiKey },
    })
    const response = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=50&sort=desc', {
      headers: brevoHeaders(apiKey),
    })
    const payload = await response.json().catch(() => ({})) as { campaigns?: { id?: number }[] }
    const campaigns = Array.isArray(payload.campaigns) ? payload.campaigns : []
    let deleted = 0
    for (const campaign of campaigns) {
      if (!campaign?.id) continue
      const del = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}`, {
        method: 'DELETE',
        headers: { accept: 'application/json', 'api-key': apiKey },
      })
      if (del.ok || del.status === 204 || del.status === 404) deleted += 1
    }
    return json(200, { ok: true, removed: email, deleted }, origin)
  }

  if (action === 'send' || action === 'schedule') {
    if (!senderEmail) return json(503, { error: 'brevo_sender_missing' }, origin)
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const bodyText = typeof body.bodyText === 'string' ? body.bodyText.trim() : ''
    const signature = typeof body.signature === 'string' ? body.signature : '— DOYA'
    const htmlFromClient = typeof body.htmlContent === 'string' ? body.htmlContent.trim() : ''
    const sendLang = normalizeSendLang(body.lang)
    const logoSrc = emailLogoPublicUrl()
    const htmlContent = rewriteEmailLogoSrc(
      htmlFromClient || (bodyText ? buildNewsletterHtml(bodyText, signature, logoSrc) : ''),
      logoSrc,
    )
    let previewText = typeof body.previewText === 'string' ? body.previewText.trim() : ''
    if (!previewText && bodyText) previewText = bodyText.replace(/\s+/g, ' ').slice(0, 120)
    const name = typeof body.name === 'string' && body.name.trim()
      ? body.name.trim()
      : `DOYA — ${subject || 'Newsletter'}`
    const scheduledAt = typeof body.scheduledAt === 'string' ? body.scheduledAt.trim() : ''
    const langSuffix = sendLang === 'all' ? '' : ` · ${sendLang.toUpperCase()}`

    if (!subject || !htmlContent) return json(400, { error: 'invalid_campaign' }, origin)
    if (action === 'schedule' && !scheduledAt) return json(400, { error: 'invalid_schedule' }, origin)

    let emails: string[] = []
    try {
      emails = await fetchListEmails(apiKey, listId, sendLang)
    } catch {
      return json(502, { error: 'brevo_list_contacts_failed' }, origin)
    }
    if (!emails.length) {
      return json(400, {
        error: sendLang === 'all' ? 'list_empty' : 'list_empty_lang',
        lang: sendLang,
      }, origin)
    }

    for (const group of chunk(emails, 50)) {
      const sendPayload: Record<string, unknown> = {
        sender: { name: senderName, email: senderEmail },
        to: group.map((email) => ({ email })),
        subject,
        htmlContent,
      }
      if (action === 'schedule') sendPayload.scheduledAt = scheduledAt
      const sendRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: brevoHeaders(apiKey),
        body: JSON.stringify(sendPayload),
      })
      if (!sendRes.ok) {
        const errPayload = await sendRes.json().catch(() => ({}))
        console.error('brevo_tx_send_failed', errPayload)
        return json(502, {
          error: action === 'schedule' ? 'brevo_schedule_failed' : 'brevo_send_failed',
          detail: (errPayload as { message?: string })?.message ?? null,
        }, origin)
      }
    }

    const db = serviceClient()
    const savedName = action === 'send'
      ? `${name}${langSuffix} · immédiat`
      : `${name}${langSuffix}`
    const { data: saved, error: saveError } = await db
      .from('newsletter_messages')
      .insert({
        subject,
        name: savedName,
        preview_text: previewText,
        html_content: htmlContent,
        mode: action === 'send' ? 'send' : 'schedule',
        status: action === 'send' ? 'sent' : 'scheduled',
        sent_count: emails.length,
        brevo_campaign_id: null,
        scheduled_at: action === 'schedule' ? scheduledAt : null,
        sent_at: action === 'schedule' ? scheduledAt : new Date().toISOString(),
        created_by: admin.email,
      })
      .select('id')
      .maybeSingle()
    if (saveError) console.error('newsletter_save_failed', saveError)

    return json(200, {
      ok: true,
      mode: action,
      sent: emails.length,
      lang: sendLang,
      campaignId: saved?.id ?? null,
    }, origin)
  }

  return json(400, { error: 'invalid_action' }, origin)
})
