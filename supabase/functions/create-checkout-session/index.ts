import { CART_LIMITS } from '../_shared/limits.ts'
import { checkoutReturnOrigin, json, preflight, rejectOrigin } from '../_shared/http.ts'
import { serviceClient, stripeClient, userClient } from '../_shared/clients.ts'
import { loadShippingZones, shippingZoneByCountry, stripeShippingOption } from '../_shared/shipping.ts'
import { allowRatePersistent, clientIp, privateRateKey } from '../_shared/rateLimit.ts'
import {
  normalizeCheckoutLocale,
  stripeCheckoutLocale,
  stripeLineDescription,
  stripeProductName,
  stripeShippingCountryHint,
  stripeShippingDisplayName,
} from '../_shared/checkoutLabels.ts'

const CHECKOUT_WINDOW_MS = 15 * 60 * 1000
const CHECKOUT_MAX_PER_IP = 8
const CHECKOUT_MAX_PER_EMAIL = 5
const TERMS_VERSION = '2026-10-02'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const ip = clientIp(req)
  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, await privateRateKey('checkout:ip', ip), CHECKOUT_MAX_PER_IP, CHECKOUT_WINDOW_MS))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  let body: {
    items?: { productId?: string; size?: string; quantity?: number }[]
    email?: string
    promoCode?: string
    shippingCountry?: string
    locale?: string
    termsAccepted?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const locale = normalizeCheckoutLocale(body.locale)
  if (body.termsAccepted !== true) {
    return json(400, { error: 'terms_required' }, origin)
  }

  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length || items.length > CART_LIMITS.maxLines) {
    return json(400, { error: 'invalid_cart' }, origin)
  }

  const sanitized = []
  let totalQuantity = 0
  for (const item of items) {
    const productId = typeof item.productId === 'string' ? item.productId : ''
    const size = typeof item.size === 'string' ? item.size.trim() : ''
    const quantity = Number(item.quantity)
    if (!CART_LIMITS.productIdPattern.test(productId) || !size || size.length > CART_LIMITS.maxVariantKeyLength) {
      return json(400, { error: 'invalid_cart' }, origin)
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > CART_LIMITS.maxLineQuantity) {
      return json(400, { error: 'invalid_cart' }, origin)
    }
    totalQuantity += quantity
    sanitized.push({ productId, size, quantity })
  }
  if (totalQuantity > CART_LIMITS.maxTotalQuantity) return json(400, { error: 'invalid_cart' }, origin)

  await admin.rpc('release_stale_reservations')

  let userId: string | null = null
  let email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const tokenRole = (() => {
    try {
      const payload = token.split('.')[1]
      if (!payload) return null
      const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      return (JSON.parse(json) as { role?: string }).role ?? null
    } catch {
      return null
    }
  })()
  // Guest checkout sends the anon JWT. Only treat real user sessions as authenticated.
  if (token && token !== anon && tokenRole === 'authenticated') {
    const { data, error } = await userClient(token).auth.getUser(token)
    if (error || !data.user?.email) return json(401, { error: 'invalid_session' }, origin)
    userId = data.user.id
    email = data.user.email.toLowerCase()
  }
  if (!email) return json(400, { error: 'email_required' }, origin)

  if (!(await allowRatePersistent(admin, await privateRateKey('checkout:email', email), CHECKOUT_MAX_PER_EMAIL, CHECKOUT_WINDOW_MS))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  const country = typeof body.shippingCountry === 'string' ? body.shippingCountry.trim().toUpperCase() : ''
  let shippingZones
  try {
    shippingZones = await loadShippingZones(admin, false)
  } catch (error) {
    console.error('shipping_zones_unavailable', error)
    return json(503, { error: 'shipping_not_configured' }, origin)
  }
  const zone = shippingZoneByCountry(shippingZones, country)
  if (!zone) return json(400, { error: 'invalid_shipping_country' }, origin)

  // Tarif dérivé du pays. Stripe ne propose que les pays de cette zone + un seul forfait.
  const { data: order, error: orderError } = await admin.rpc('create_pending_order', {
    p_email: email,
    p_user_id: userId,
    p_items: sanitized,
    p_promo_code: typeof body.promoCode === 'string' ? body.promoCode : null,
    p_shipping_cents: zone.amountCents,
  })

  if (orderError || !order) {
    const message = orderError?.message ?? 'order_failed'
    console.error('create_pending_order', orderError?.code ?? '', message)
    const known = ['invalid_email', 'empty_cart', 'too_many_lines', 'too_many_items', 'invalid_product', 'invalid_size', 'invalid_quantity', 'product_unavailable', 'out_of_stock', 'promo_invalid', 'promo_needs_tees', 'promo_needs_cds', 'promo_already_used', 'shipping_quote_required', 'invalid_shipping', 'forbidden']
    const code = known.find((item) => message.includes(item))
    return json(code ? 409 : 400, { error: code ?? 'order_failed' }, origin)
  }

  const { error: metadataError } = await admin
    .from('orders')
    .update({
      locale,
      shipping_zone_id: zone.id,
      shipping_country: country,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    })
    .eq('id', order.orderId)
  if (metadataError) {
    console.error('order_metadata_update_failed', metadataError)
    await admin.rpc('release_reservation', { p_order_id: order.orderId })
    return json(500, { error: 'order_failed' }, origin)
  }

  const site = checkoutReturnOrigin(origin)
  const stripe = stripeClient()
  const lineItems = (order.lines as { name: string; productId: string; size: string; variantLabel?: string; quantity: number; unitPriceCents: number }[]).map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: line.unitPriceCents,
      product_data: {
        name: stripeProductName(line.productId, locale, line.name),
        description: stripeLineDescription(line.size, locale, line.variantLabel),
        metadata: { productId: line.productId, size: line.size },
      },
    },
  }))

  let sessionId = ''
  try {
    const discounts = []
    if (order.discountCents > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: order.discountCents,
        currency: 'eur',
        duration: 'once',
        max_redemptions: 1,
        metadata: { orderId: order.orderId, orderNumber: order.orderNumber ?? '' },
      })
      discounts.push({ coupon: coupon.id })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: stripeCheckoutLocale(locale),
      customer_email: email,
      client_reference_id: order.orderNumber ?? order.orderId,
      success_url: `${site}/commande?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/panier?canceled=1&session_id={CHECKOUT_SESSION_ID}`,
      // Stripe exige au moins 30 min ; garder une marge évite la borne exacte en cas de léger décalage d'horloge.
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: zone.countries,
      },
      custom_text: {
        shipping_address: {
          message: stripeShippingCountryHint(locale, `${site}/panier`),
        },
      },
      shipping_options: [
        stripeShippingOption(
          zone,
          stripeShippingDisplayName(zone.id, locale, zone.displayName),
        ),
      ],
      line_items: lineItems,
      discounts: discounts.length ? discounts : undefined,
      metadata: {
        orderId: order.orderId,
        orderNumber: order.orderNumber ?? '',
        locale,
      },
      payment_intent_data: {
        metadata: {
          orderId: order.orderId,
          orderNumber: order.orderNumber ?? '',
          locale,
        },
      },
    })
    sessionId = session.id

    const { error: attachError } = await admin.rpc('attach_stripe_session', {
      p_order_id: order.orderId,
      p_session_id: session.id,
    })
    if (attachError) throw attachError

    if (!session.url) throw new Error('missing_checkout_url')
    return json(200, { url: session.url }, origin)
  } catch (error) {
    // Une session créée reste payable tant que Stripe n'a pas confirmé son expiration.
    let safeToRelease = !sessionId
    if (sessionId) {
      try {
        await stripe.checkout.sessions.expire(sessionId)
        safeToRelease = true
      } catch (expireError) {
        console.error('checkout_expire_failed', expireError)
      }
    }
    if (safeToRelease) {
      const { error: releaseError } = await admin.rpc('release_reservation', { p_order_id: order.orderId })
      if (releaseError) console.error('checkout_release_failed', releaseError)
    }
    console.error(error)
    return json(502, { error: 'stripe_unavailable' }, origin)
  }
})
