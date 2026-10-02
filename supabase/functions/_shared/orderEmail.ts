import { emailLogoPublicUrl } from './emailLogo.ts'
import {
  localizedProductName,
  normalizeCheckoutLocale,
  stripeLineDescription,
  type CheckoutLocale,
} from './checkoutLabels.ts'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const INTL_LOCALE: Record<CheckoutLocale, string> = {
  fr: 'fr-FR',
  es: 'es-ES',
  en: 'en-GB',
  pt: 'pt-PT',
  de: 'de-DE',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  ar: 'ar',
}

function formatEuros(cents: number, locale: CheckoutLocale = 'fr') {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

type EmailCopy = {
  confirmationSubject: string
  confirmationPreview: string
  confirmationTitle: string
  thanks: string
  orderNumber: string
  items: string
  subtotal: string
  discount: string
  shipping: string
  total: string
  delivery: string
  support: string
  shippedSubject: string
  shippedPreview: string
  shippedTitle: string
  shippedIntro: string
  tracking: string
  trackingHelp: string
  question: string
}

const EMAIL_COPY: Record<CheckoutLocale, EmailCopy> = {
  fr: {
    confirmationSubject: 'Confirmation de commande',
    confirmationPreview: 'Votre commande {number} est confirmée.',
    confirmationTitle: 'Confirmation de commande',
    thanks: 'Merci pour votre commande.',
    orderNumber: 'N° de commande',
    items: 'Articles',
    subtotal: 'Sous-total',
    discount: 'Réduction',
    shipping: 'Livraison',
    total: 'Total',
    delivery: 'Livraison',
    support: 'Conservez ce numéro pour tout échange (SAV, retour).',
    shippedSubject: 'Expédition',
    shippedPreview: 'Votre commande {number} est en route · suivi {tracking}',
    shippedTitle: 'Commande expédiée',
    shippedIntro: 'Bonne nouvelle : votre commande a été expédiée.',
    tracking: 'Numéro de suivi',
    trackingHelp: 'Utilisez ce numéro sur le site du transporteur pour suivre le colis.',
    question: 'Une question ? Écrivez-nous avec votre n° de commande.',
  },
  es: {
    confirmationSubject: 'Confirmación del pedido',
    confirmationPreview: 'Tu pedido {number} está confirmado.',
    confirmationTitle: 'Confirmación del pedido',
    thanks: 'Gracias por tu pedido.',
    orderNumber: 'N.º de pedido',
    items: 'Artículos',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    shipping: 'Envío',
    total: 'Total',
    delivery: 'Entrega',
    support: 'Guarda este número para cualquier consulta, devolución o servicio posventa.',
    shippedSubject: 'Envío',
    shippedPreview: 'Tu pedido {number} está en camino · seguimiento {tracking}',
    shippedTitle: 'Pedido enviado',
    shippedIntro: 'Buenas noticias: tu pedido ha sido enviado.',
    tracking: 'Número de seguimiento',
    trackingHelp: 'Utiliza este número en la web del transportista para seguir el paquete.',
    question: '¿Alguna pregunta? Escríbenos indicando tu número de pedido.',
  },
  en: {
    confirmationSubject: 'Order confirmation',
    confirmationPreview: 'Your order {number} is confirmed.',
    confirmationTitle: 'Order confirmation',
    thanks: 'Thank you for your order.',
    orderNumber: 'Order number',
    items: 'Items',
    subtotal: 'Subtotal',
    discount: 'Discount',
    shipping: 'Shipping',
    total: 'Total',
    delivery: 'Delivery',
    support: 'Keep this number for any support request or return.',
    shippedSubject: 'Shipping',
    shippedPreview: 'Your order {number} is on its way · tracking {tracking}',
    shippedTitle: 'Order shipped',
    shippedIntro: 'Good news: your order has been shipped.',
    tracking: 'Tracking number',
    trackingHelp: 'Use this number on the carrier’s website to track your parcel.',
    question: 'Any questions? Email us with your order number.',
  },
  pt: {
    confirmationSubject: 'Confirmação da encomenda',
    confirmationPreview: 'A tua encomenda {number} está confirmada.',
    confirmationTitle: 'Confirmação da encomenda',
    thanks: 'Obrigado pela tua encomenda.',
    orderNumber: 'N.º da encomenda',
    items: 'Artigos',
    subtotal: 'Subtotal',
    discount: 'Desconto',
    shipping: 'Envio',
    total: 'Total',
    delivery: 'Entrega',
    support: 'Guarda este número para qualquer pedido de apoio ou devolução.',
    shippedSubject: 'Envio',
    shippedPreview: 'A tua encomenda {number} está a caminho · seguimento {tracking}',
    shippedTitle: 'Encomenda enviada',
    shippedIntro: 'Boas notícias: a tua encomenda foi enviada.',
    tracking: 'Número de seguimento',
    trackingHelp: 'Usa este número no site da transportadora para acompanhar a encomenda.',
    question: 'Alguma questão? Escreve-nos indicando o número da encomenda.',
  },
  de: {
    confirmationSubject: 'Bestellbestätigung',
    confirmationPreview: 'Deine Bestellung {number} ist bestätigt.',
    confirmationTitle: 'Bestellbestätigung',
    thanks: 'Vielen Dank für deine Bestellung.',
    orderNumber: 'Bestellnummer',
    items: 'Artikel',
    subtotal: 'Zwischensumme',
    discount: 'Rabatt',
    shipping: 'Versand',
    total: 'Gesamt',
    delivery: 'Lieferung',
    support: 'Bewahre diese Nummer für Rückfragen, Support oder Rücksendungen auf.',
    shippedSubject: 'Versand',
    shippedPreview: 'Deine Bestellung {number} ist unterwegs · Sendungsnummer {tracking}',
    shippedTitle: 'Bestellung versendet',
    shippedIntro: 'Gute Nachrichten: Deine Bestellung wurde versendet.',
    tracking: 'Sendungsnummer',
    trackingHelp: 'Mit dieser Nummer kannst du das Paket auf der Website des Versanddienstleisters verfolgen.',
    question: 'Noch Fragen? Schreib uns mit deiner Bestellnummer.',
  },
  ja: {
    confirmationSubject: 'ご注文確認',
    confirmationPreview: 'ご注文 {number} を確認しました。',
    confirmationTitle: 'ご注文確認',
    thanks: 'ご注文ありがとうございます。',
    orderNumber: '注文番号',
    items: '商品',
    subtotal: '小計',
    discount: '割引',
    shipping: '送料',
    total: '合計',
    delivery: '配送先',
    support: 'お問い合わせや返品の際に、この注文番号を保管してください。',
    shippedSubject: '発送',
    shippedPreview: 'ご注文 {number} を発送しました · 追跡番号 {tracking}',
    shippedTitle: 'ご注文を発送しました',
    shippedIntro: 'ご注文の商品を発送しました。',
    tracking: '追跡番号',
    trackingHelp: '配送会社のウェブサイトでこの番号を入力すると、配送状況を確認できます。',
    question: 'ご不明な点がある場合は、注文番号を添えてお問い合わせください。',
  },
  ko: {
    confirmationSubject: '주문 확인',
    confirmationPreview: '주문 {number}이(가) 확인되었습니다.',
    confirmationTitle: '주문 확인',
    thanks: '주문해 주셔서 감사합니다.',
    orderNumber: '주문 번호',
    items: '상품',
    subtotal: '소계',
    discount: '할인',
    shipping: '배송비',
    total: '합계',
    delivery: '배송지',
    support: '문의나 반품을 위해 이 주문 번호를 보관해 주세요.',
    shippedSubject: '배송',
    shippedPreview: '주문 {number}이(가) 발송되었습니다 · 운송장 {tracking}',
    shippedTitle: '주문이 발송되었습니다',
    shippedIntro: '좋은 소식입니다. 주문 상품이 발송되었습니다.',
    tracking: '운송장 번호',
    trackingHelp: '배송사 웹사이트에서 이 번호로 배송 상태를 확인할 수 있습니다.',
    question: '문의 사항이 있으면 주문 번호와 함께 이메일을 보내 주세요.',
  },
  zh: {
    confirmationSubject: '订单确认',
    confirmationPreview: '你的订单 {number} 已确认。',
    confirmationTitle: '订单确认',
    thanks: '感谢你的订单。',
    orderNumber: '订单号',
    items: '商品',
    subtotal: '小计',
    discount: '优惠',
    shipping: '运费',
    total: '总计',
    delivery: '收货信息',
    support: '如需售后或退货，请保留此订单号。',
    shippedSubject: '发货',
    shippedPreview: '你的订单 {number} 已发货 · 物流单号 {tracking}',
    shippedTitle: '订单已发货',
    shippedIntro: '好消息：你的订单已经发货。',
    tracking: '物流单号',
    trackingHelp: '可在承运商网站输入此号码查询包裹状态。',
    question: '如有疑问，请在邮件中注明订单号。',
  },
  ar: {
    confirmationSubject: 'تأكيد الطلب',
    confirmationPreview: 'تم تأكيد طلبك {number}.',
    confirmationTitle: 'تأكيد الطلب',
    thanks: 'شكرًا لطلبك.',
    orderNumber: 'رقم الطلب',
    items: 'المنتجات',
    subtotal: 'المجموع الفرعي',
    discount: 'الخصم',
    shipping: 'الشحن',
    total: 'الإجمالي',
    delivery: 'التسليم',
    support: 'احتفظ برقم الطلب لأي استفسار أو إرجاع.',
    shippedSubject: 'الشحن',
    shippedPreview: 'طلبك {number} في الطريق · رقم التتبع {tracking}',
    shippedTitle: 'تم شحن الطلب',
    shippedIntro: 'خبر سار: تم شحن طلبك.',
    tracking: 'رقم التتبع',
    trackingHelp: 'استخدم هذا الرقم على موقع شركة الشحن لتتبع طردك.',
    question: 'لديك سؤال؟ راسلنا مع ذكر رقم الطلب.',
  },
}

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

export type OrderEmailLine = {
  productId?: string
  name: string
  size: string
  variantLabel?: string
  quantity: number
  unitPriceCents: number
}

export type OrderEmailPayload = {
  orderNumber: string
  email: string
  locale?: string
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

function linesHtml(lines: OrderEmailLine[], locale: CheckoutLocale) {
  const amountAlign = locale === 'ar' ? 'left' : 'right'
  return lines.map((line) => {
    const name = localizedProductName(line.productId ?? '', locale, line.name)
    const size = stripeLineDescription(line.size, locale, line.variantLabel ?? '')
    return `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee;font-size:15px;color:#2c2926;">
${escapeHtml(String(line.quantity))} × ${escapeHtml(name)} <span style="color:#7a736c;">(${escapeHtml(size)})</span>
</td>
<td align="${amountAlign}" dir="ltr" style="padding:8px 0;border-bottom:1px solid #eee;font-size:15px;color:#2c2926;white-space:nowrap;">
${escapeHtml(formatEuros(line.unitPriceCents * line.quantity, locale))}
</td>
</tr>`
  }).join('')
}

function totalsHtml(order: OrderEmailPayload, locale: CheckoutLocale) {
  const copy = EMAIL_COPY[locale]
  const rows = [
    [copy.subtotal, order.subtotalCents],
    order.discountCents > 0 ? [`${copy.discount}${order.promoCode ? ` (${order.promoCode})` : ''}`, -order.discountCents] : null,
    [copy.shipping, order.shippingCents],
    [copy.total, order.totalCents],
  ].filter(Boolean) as [string, number][]

  const amountAlign = locale === 'ar' ? 'left' : 'right'
  return rows.map(([label, cents], index) => {
    const strong = index === rows.length - 1
    return `<tr>
<td style="padding:6px 0;font-size:${strong ? 16 : 14}px;color:#2c2926;${strong ? 'font-weight:700;' : ''}">${escapeHtml(label)}</td>
<td align="${amountAlign}" dir="ltr" style="padding:6px 0;font-size:${strong ? 16 : 14}px;color:#2c2926;${strong ? 'font-weight:700;' : ''}">${escapeHtml(formatEuros(cents, locale))}</td>
</tr>`
  }).join('')
}

function shell(title: string, bodyHtml: string, locale: CheckoutLocale = 'fr') {
  const logo = emailLogoPublicUrl()
  const rtl = locale === 'ar'
  const dir = rtl ? 'rtl' : 'ltr'
  const align = rtl ? 'right' : 'left'
  const titleStyle = rtl ? 'letter-spacing:0;text-transform:none;' : 'letter-spacing:.06em;text-transform:uppercase;'
  return `<!DOCTYPE html>
<html lang="${INTL_LOCALE[locale]}" dir="${dir}"><head><meta charset="utf-8"></head>
<body dir="${dir}" style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" dir="${dir}" style="max-width:560px;background:#ffffff;border:1px solid #e4ddd3;text-align:${align};">
<tr><td align="center" style="padding:28px 28px 8px;">
<img src="${escapeHtml(logo)}" width="168" height="150" alt="DOYA" style="display:block;margin:0 auto;border:0;width:168px;height:auto;max-width:55%;" />
</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Arial,Tahoma,sans-serif;">
<p style="margin:0 0 18px;font-size:22px;${titleStyle}color:#2c2926;">${escapeHtml(title)}</p>
${bodyHtml}
</td></tr></table></td></tr></table></body></html>`
}

export function customerOrderEmailHtml(order: OrderEmailPayload) {
  const locale = normalizeCheckoutLocale(order.locale)
  const copy = EMAIL_COPY[locale]
  const address = formatAddress(order.shippingAddress)
  const phone = typeof order.shippingPhone === 'string' ? order.shippingPhone.trim() : ''
  const shipBlock = order.shippingName || address || phone
    ? `<p style="margin:18px 0 6px;font-size:13px;color:#7a736c;">${escapeHtml(copy.delivery)}</p>
<p dir="auto" style="margin:0 0 18px;font-size:15px;line-height:1.5;color:#2c2926;">${order.shippingName ? `${escapeHtml(order.shippingName)}<br>` : ''}${address}${phone ? `${address ? '<br>' : ''}<span dir="ltr">${escapeHtml(phone)}</span>` : ''}</p>`
    : ''

  const body = `
<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#2c2926;">${escapeHtml(copy.thanks)}</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#2c2926;"><strong>${escapeHtml(copy.orderNumber)}:</strong> <span dir="ltr">${escapeHtml(order.orderNumber)}</span></p>
<p style="margin:0 0 6px;font-size:13px;color:#7a736c;">${escapeHtml(copy.items)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">${linesHtml(order.lines, locale)}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" dir="${locale === 'ar' ? 'rtl' : 'ltr'}" style="margin-top:12px;">${totalsHtml(order, locale)}</table>
${shipBlock}
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#7a736c;">${escapeHtml(copy.support)} <a dir="ltr" href="mailto:almenaprod@gmail.com" style="color:#2c2926;">almenaprod@gmail.com</a></p>
<p dir="ltr" style="margin:16px 0 0;font-size:14px;color:#2c2926;">DOYA · ALMENA PROD</p>`

  return shell(copy.confirmationTitle, body, locale)
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
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${linesHtml(order.lines, 'fr')}</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">${totalsHtml(order, 'fr')}</table>`

  return shell(`Commande ${order.orderNumber}`, body, 'fr')
}

export function shippedOrderEmailHtml(order: OrderEmailPayload & { trackingNumber: string }) {
  const locale = normalizeCheckoutLocale(order.locale)
  const copy = EMAIL_COPY[locale]
  const tracking = escapeHtml(order.trackingNumber.trim())
  const body = `
<p style="margin:0 0 12px;font-size:16px;line-height:1.55;color:#2c2926;">${escapeHtml(copy.shippedIntro)}</p>
<p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:#2c2926;"><strong>${escapeHtml(copy.orderNumber)}:</strong> <span dir="ltr">${escapeHtml(order.orderNumber)}</span></p>
<p style="margin:0 0 6px;font-size:13px;color:#7a736c;">${escapeHtml(copy.tracking)}</p>
<p dir="ltr" style="margin:0 0 18px;font-size:18px;line-height:1.4;color:#2c2926;font-weight:700;">${tracking}</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#2c2926;">${escapeHtml(copy.trackingHelp)}</p>
<p style="margin:0 0 6px;font-size:13px;color:#7a736c;">${escapeHtml(copy.items)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">${linesHtml(order.lines, locale)}</table>
<p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#7a736c;">${escapeHtml(copy.question)} <a dir="ltr" href="mailto:almenaprod@gmail.com" style="color:#2c2926;">almenaprod@gmail.com</a></p>
<p dir="ltr" style="margin:16px 0 0;font-size:14px;color:#2c2926;">DOYA · ALMENA PROD</p>`

  return shell(copy.shippedTitle, body, locale)
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

export function merchantNotificationEmail() {
  return (Deno.env.get('ORDER_NOTIFY_EMAIL') ?? 'almenaprod@gmail.com').trim().toLowerCase()
}

export async function sendCustomerOrderEmail(order: OrderEmailPayload) {
  const locale = normalizeCheckoutLocale(order.locale)
  const copy = EMAIL_COPY[locale]
  return sendBrevoEmail({
    to: order.email,
    subject: `DOYA — ${copy.confirmationSubject} ${order.orderNumber}`,
    previewText: fill(copy.confirmationPreview, { number: order.orderNumber }),
    htmlContent: customerOrderEmailHtml(order),
  })
}

export async function sendMerchantOrderEmail(order: OrderEmailPayload) {
  const merchant = merchantNotificationEmail()
  if (!merchant || merchant === order.email.trim().toLowerCase()) return true
  return sendBrevoEmail({
    to: merchant,
    subject: `Nouvelle commande ${order.orderNumber}`,
    previewText: `${order.email} · ${formatEuros(order.totalCents, 'fr')}`,
    htmlContent: merchantOrderEmailHtml(order),
  })
}

export async function sendPaidOrderEmails(order: OrderEmailPayload) {
  const customer = await sendCustomerOrderEmail(order)
  const merchant = await sendMerchantOrderEmail(order)
  return { customer, merchant }
}

export async function sendShippedOrderEmail(order: OrderEmailPayload & { trackingNumber: string }) {
  const tracking = order.trackingNumber.trim()
  if (!tracking) return false
  const locale = normalizeCheckoutLocale(order.locale)
  const copy = EMAIL_COPY[locale]
  return sendBrevoEmail({
    to: order.email,
    subject: `DOYA — ${copy.shippedSubject} ${order.orderNumber}`,
    previewText: fill(copy.shippedPreview, { number: order.orderNumber, tracking }),
    htmlContent: shippedOrderEmailHtml({ ...order, trackingNumber: tracking }),
  })
}
