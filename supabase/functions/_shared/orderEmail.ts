import { emailLogoPublicUrl } from './emailLogo.ts'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatEuros(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export type OrderEmailLine = {
  name: string
  size: string
  quantity: number
  unitPriceCents: number
}

export type OrderEmailPayload = {
  orderNumber: string
  email: string
  shippingName: string | null
  shippingPhone: string | null
  shippingAddress: Record<string, unknown> | null
  subtotalCents: number
  discountCents: number
  shippingCents: number
  totalCents: number
  promoCode: string | null
  lines: OrderEmailLine[]
}

function formatAddress(address: Record<string, unknown> | null) {
  if (!address) return ''
  const parts = [
    address.line1,
    address.line2,
    [address.postal_code, address.city].filter(Boolean).join(' '),
    address.state,
    address.country,
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
  return parts.join('<br>')
}

function linesHtml(lines: OrderEmailLine[]) {
  return lines.map((line) => {
    const size = line.size === 'CD' || line.size === 'U'
      ? 'Digipack'
      : line.size === 'VINYL'
        ? 'Vinyle'
        : line.size === 'ENF'
          ? 'Taille enfant'
          : `Taille ${line.size}`
    return `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee;font-size:15px;color:#2c2926;">
${escapeHtml(String(line.quantity))} × ${escapeHtml(line.name)} <span style="color:#7a736c;">(${escapeHtml(size)})</span>
</td>
<td align="right" style="padding:8px 0;border-bottom:1px solid #eee;font-size:15px;color:#2c2926;white-space:nowrap;">
${escapeHtml(formatEuros(line.unitPriceCents * line.quantity))}
</td>
</tr>`
  }).join('')
}

function totalsHtml(order: OrderEmailPayload) {
  const rows = [
    ['Sous-total', order.subtotalCents],
    order.discountCents > 0 ? [`Réduction${order.promoCode ? ` (${order.promoCode})` : ''}`, -order.discountCents] : null,
    ['Livraison', order.shippingCents],
    ['Total', order.totalCents],
  ].filter(Boolean) as [string, number][]

  return rows.map(([label, cents], index) => {
    const strong = index === rows.length - 1
    return `<tr>
<td style="padding:6px 0;font-size:${strong ? 16 : 14}px;color:#2c2926;${strong ? 'font-weight:700;' : ''}">${escapeHtml(label)}</td>
<td align="right" style="padding:6px 0;font-size:${strong ? 16 : 14}px;color:#2c2926;${strong ? 'font-weight:700;' : ''}">${escapeHtml(formatEuros(cents))}</td>
</tr>`
  }).join('')
}

function shell(title: string, bodyHtml: string) {
  const logo = emailLogoPublicUrl()
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e4ddd3;">
<tr><td align="center" style="padding:28px 28px 8px;">
<img src="${escapeHtml(logo)}" width="168" height="150" alt="DOYA" style="display:block;margin:0 auto;border:0;width:168px;height:auto;max-width:55%;" />
</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Helvetica,Arial,sans-serif;">
<p style="margin:0 0 18px;font-family:Georgia,serif;font-size:22px;letter-spacing:.06em;text-transform:uppercase;color:#2c2926;">${escapeHtml(title)}</p>
${bodyHtml}
</td></tr></table></td></tr></table></body></html>`
}

export function customerOrderEmailHtml(order: OrderEmailPayload) {
  const address = formatAddress(order.shippingAddress)
  const phone = typeof order.shippingPhone === 'string' ? order.shippingPhone.trim() : ''
  const shipBlock = order.shippingName || address || phone
    ? `<p style="margin:18px 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#7a736c;">Livraison</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#2c2926;">${order.shippingName ? `${escapeHtml(order.shippingName)}<br>` : ''}${address}${phone ? `${address ? '<br>' : ''}${escapeHtml(phone)}` : ''}</p>`
    : ''

  const body = `
<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#2c2926;">Merci pour votre commande.</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#2c2926;"><strong>N° de commande :</strong> ${escapeHtml(order.orderNumber)}</p>
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#7a736c;">Articles</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${linesHtml(order.lines)}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">${totalsHtml(order)}</table>
${shipBlock}
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#7a736c;">Conservez ce numéro pour tout échange (SAV, retour) à <a href="mailto:almenaprod@gmail.com" style="color:#2c2926;">almenaprod@gmail.com</a>.</p>
<p style="margin:16px 0 0;font-size:14px;letter-spacing:.04em;color:#2c2926;">DOYA · ALMENA PROD</p>`

  return shell('Confirmation de commande', body)
}

export function merchantOrderEmailHtml(order: OrderEmailPayload) {
  const address = formatAddress(order.shippingAddress)
  const phone = typeof order.shippingPhone === 'string' ? order.shippingPhone.trim() : ''
  const body = `
<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#2c2926;"><strong>Nouvelle commande payée</strong></p>
<p style="margin:0 0 8px;font-size:16px;color:#2c2926;"><strong>N° :</strong> ${escapeHtml(order.orderNumber)}</p>
<p style="margin:0 0 8px;font-size:15px;color:#2c2926;"><strong>Client :</strong> ${escapeHtml(order.email)}</p>
${order.shippingName ? `<p style="margin:0 0 8px;font-size:15px;color:#2c2926;"><strong>Nom :</strong> ${escapeHtml(order.shippingName)}</p>` : ''}
${phone ? `<p style="margin:0 0 8px;font-size:15px;color:#2c2926;"><strong>Téléphone :</strong> ${escapeHtml(phone)}</p>` : ''}
${address ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#2c2926;"><strong>Adresse :</strong><br>${address}</p>` : ''}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${linesHtml(order.lines)}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">${totalsHtml(order)}</table>`

  return shell(`Commande ${order.orderNumber}`, body)
}

export function shippedOrderEmailHtml(order: OrderEmailPayload & { trackingNumber: string }) {
  const tracking = escapeHtml(order.trackingNumber.trim())
  const body = `
<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#2c2926;">Bonne nouvelle : votre commande a été expédiée.</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#2c2926;"><strong>N° de commande :</strong> ${escapeHtml(order.orderNumber)}</p>
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#7a736c;">Numéro de suivi</p>
<p style="margin:0 0 18px;font-size:18px;line-height:1.4;color:#2c2926;font-weight:700;letter-spacing:.02em;">${tracking}</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#2c2926;">Utilisez ce numéro sur le site du transporteur pour suivre le colis.</p>
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#7a736c;">Articles</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${linesHtml(order.lines)}</table>
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#7a736c;">Une question ? Écrivez à <a href="mailto:almenaprod@gmail.com" style="color:#2c2926;">almenaprod@gmail.com</a> avec votre n° de commande.</p>
<p style="margin:16px 0 0;font-size:14px;letter-spacing:.04em;color:#2c2926;">DOYA · ALMENA PROD</p>`

  return shell('Commande expédiée', body)
}

export async function sendBrevoEmail(opts: {
  to: string | string[]
  subject: string
  htmlContent: string
  previewText?: string
  replyTo?: string
}) {
  const apiKey = (Deno.env.get('BREVO_API_KEY') ?? '').trim()
  const senderEmail = (Deno.env.get('BREVO_SENDER_EMAIL') ?? '').trim()
  const senderName = (Deno.env.get('BREVO_SENDER_NAME') ?? 'DOYA').trim() || 'DOYA'
  if (!apiKey || !senderEmail) {
    console.warn('order_email_skipped_brevo_unconfigured')
    return false
  }

  const to = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .map((email) => ({ email }))
  if (!to.length) return false

  const replyTo = typeof opts.replyTo === 'string' ? opts.replyTo.trim().toLowerCase() : ''
  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to,
    subject: opts.subject,
    htmlContent: opts.htmlContent,
    previewText: opts.previewText,
  }
  if (replyTo) payload.replyTo = { email: replyTo }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    console.error('brevo_order_email_failed', response.status, payload)
    return false
  }
  return true
}

export async function sendPaidOrderEmails(order: OrderEmailPayload) {
  const merchant = (Deno.env.get('ORDER_NOTIFY_EMAIL') ?? 'almenaprod@gmail.com').trim().toLowerCase()
  await sendBrevoEmail({
    to: order.email,
    subject: `DOYA — Confirmation ${order.orderNumber}`,
    previewText: `Votre commande ${order.orderNumber} est confirmée.`,
    htmlContent: customerOrderEmailHtml(order),
  })
  if (merchant && merchant !== order.email) {
    await sendBrevoEmail({
      to: merchant,
      subject: `Nouvelle commande ${order.orderNumber}`,
      previewText: `${order.email} · ${formatEuros(order.totalCents)}`,
      htmlContent: merchantOrderEmailHtml(order),
    })
  }
}

export async function sendShippedOrderEmail(order: OrderEmailPayload & { trackingNumber: string }) {
  const tracking = order.trackingNumber.trim()
  if (!tracking) return false
  return sendBrevoEmail({
    to: order.email,
    subject: `DOYA — Expédition ${order.orderNumber}`,
    previewText: `Votre commande ${order.orderNumber} est en route · suivi ${tracking}`,
    htmlContent: shippedOrderEmailHtml({ ...order, trackingNumber: tracking }),
  })
}
