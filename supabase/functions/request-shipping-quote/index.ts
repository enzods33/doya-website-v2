import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { sendBrevoEmail } from '../_shared/orderEmail.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { CART_LIMITS, FLAT_SHIPPING_LIMITS } from '../_shared/limits.ts'
import { serviceClient } from '../_shared/clients.ts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 6
const MESSAGE_MAX = 2000

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

type QuoteItem = {
  productId: string
  size: string
  quantity: number
  name?: string
  unitPriceCents?: number
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const ip = clientIp(req)
  const allowed = await allowRatePersistent(
    serviceClient(),
    `shipping-quote:ip:${ip}`,
    RATE_MAX,
    RATE_WINDOW_MS,
  )
  if (!allowed) return json(429, { error: 'rate_limited' }, origin)

  let body: {
    email?: string
    message?: string
    shippingCountry?: string
    locale?: string
    items?: QuoteItem[]
    website?: string
  }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  // Honeypot
  if (typeof body.website === 'string' && body.website.trim()) {
    return json(200, { ok: true }, origin)
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  const shippingCountry = typeof body.shippingCountry === 'string' ? body.shippingCountry.trim().toUpperCase() : ''
  const locale = typeof body.locale === 'string' ? body.locale.trim().toLowerCase() : 'fr'
  const items = Array.isArray(body.items) ? body.items : []

  if (!EMAIL_RE.test(email)) return json(400, { error: 'invalid_email' }, origin)
  if (!message || message.length < 5) return json(400, { error: 'invalid_message' }, origin)
  if (message.length > MESSAGE_MAX) return json(400, { error: 'message_too_long' }, origin)
  if (!shippingCountry || shippingCountry.length !== 2) {
    return json(400, { error: 'invalid_shipping_country' }, origin)
  }
  if (!items.length || items.length > CART_LIMITS.maxLines) {
    return json(400, { error: 'invalid_cart' }, origin)
  }

  const normalized: { productId: string; size: string; quantity: number; name: string; unitPriceCents: number }[] = []
  let teeQty = 0
  let cdQty = 0
  let subtotalCents = 0

  for (const item of items) {
    const productId = typeof item?.productId === 'string' ? item.productId.trim() : ''
    const size = typeof item?.size === 'string' ? item.size.trim().toUpperCase() : ''
    const quantity = Number(item?.quantity)
    if (!CART_LIMITS.productIdPattern.test(productId) || !CART_LIMITS.sizes.includes(size as typeof CART_LIMITS.sizes[number])) {
      return json(400, { error: 'invalid_cart' }, origin)
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > CART_LIMITS.maxLineQuantity) {
      return json(400, { error: 'invalid_quantity' }, origin)
    }
    normalized.push({ productId, size, quantity, name: productId, unitPriceCents: 0 })
  }

  const db = serviceClient()
  const productIds = [...new Set(normalized.map((item) => item.productId))]
  const { data: products, error: productsError } = await db
    .from('products')
    .select('id, type, name, price_cents, on_sale')
    .in('id', productIds)
  if (productsError || !products?.length) return json(400, { error: 'invalid_cart' }, origin)

  const productMap = new Map(products.map((row) => [row.id, row]))
  if (productIds.some((id) => !productMap.has(id))) return json(400, { error: 'invalid_cart' }, origin)

  const priced = normalized.map((item) => {
    const product = productMap.get(item.productId)!
    const unitPriceCents = Number(product.price_cents) || 0
    return {
      ...item,
      name: String(product.name || item.name || item.productId),
      unitPriceCents,
      type: String(product.type || ''),
    }
  })

  for (const item of priced) {
    if (item.type === 'CD') cdQty += item.quantity
    else if (item.type === 'T-shirt') teeQty += item.quantity
  }
  subtotalCents = priced.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)

  if (teeQty <= FLAT_SHIPPING_LIMITS.maxTees && cdQty <= FLAT_SHIPPING_LIMITS.maxCds) {
    return json(400, { error: 'quote_not_required' }, origin)
  }

  // Devis : atelier + suivi technique (toujours ces 2 destinataires).
  const notify = [
    ...(Deno.env.get('ORDER_NOTIFY_EMAIL') ?? 'almenaprod@gmail.com')
      .split(/[,;\s]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    'stephanedasil@gmail.com',
  ].filter((email, index, list) => list.indexOf(email) === index)
  const linesHtml = priced.map((item) => {
    const size = item.size === 'CD' || item.size === 'U'
      ? 'CD'
      : item.size === 'VINYL'
        ? 'vinyle'
        : item.size === 'ENF'
          ? 'enfant'
          : `taille ${item.size}`
    return `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee;font-size:15px;color:#2c2926;">
${escapeHtml(String(item.quantity))} × ${escapeHtml(item.name)} <span style="color:#7a736c;">(${escapeHtml(size)})</span>
</td>
<td align="right" style="padding:8px 0;border-bottom:1px solid #eee;font-size:15px;color:#2c2926;white-space:nowrap;">
${escapeHtml(formatEuros(item.unitPriceCents * item.quantity))}
</td>
</tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f4f1ec;font-family:Helvetica,Arial,sans-serif;color:#2c2926;">
<p style="margin:0 0 12px;font-size:18px;"><strong>Demande de devis livraison</strong></p>
<p style="margin:0 0 8px;"><strong>Client :</strong> ${escapeHtml(email)}</p>
<p style="margin:0 0 8px;"><strong>Pays :</strong> ${escapeHtml(shippingCountry)}</p>
<p style="margin:0 0 8px;"><strong>Langue UI :</strong> ${escapeHtml(locale)}</p>
<p style="margin:0 0 8px;"><strong>Volumes :</strong> ${teeQty} tee-shirt(s) · ${cdQty} CD</p>
<p style="margin:16px 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#7a736c;">Message</p>
<p style="margin:0 0 18px;white-space:pre-wrap;line-height:1.5;">${escapeHtml(message)}</p>
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#7a736c;">Panier</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${linesHtml}</table>
<p style="margin:12px 0 0;"><strong>Sous-total articles :</strong> ${escapeHtml(formatEuros(subtotalCents))}</p>
<p style="margin:8px 0 0;color:#7a736c;font-size:13px;">Port hors forfait (sur devis) — pas de paiement Stripe.</p>
</body></html>`

  const sent = await sendBrevoEmail({
    to: notify,
    replyTo: email,
    subject: `DOYA — Devis livraison (${teeQty} tees / ${cdQty} CD)`,
    previewText: `${email} · ${shippingCountry} · ${teeQty} tees / ${cdQty} CD`,
    htmlContent: html,
  })

  if (!sent) return json(502, { error: 'quote_send_failed' }, origin)
  return json(200, { ok: true }, origin)
})
