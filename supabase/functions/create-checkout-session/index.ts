import { CART_LIMITS } from '../_shared/limits.ts'
import { checkoutReturnOrigin, json, preflight, rejectOrigin } from '../_shared/http.ts'
import { serviceClient, stripeClient, userClient } from '../_shared/clients.ts'
import { shippingZoneByCountry, stripeShippingOption } from '../_shared/shipping.ts'

const PRODUCT_NAMES: Record<string, string> = {
  'luna-bohemia-white': 'Luna Bohemia — Blanc',
  'luna-bohemia-black': 'Luna Bohemia — Noir',
  'doya-white': 'DOYA — Blanc',
  'doya-black': 'DOYA — Noir',
  'cd-luna-bohemia': 'Luna Bohemia — CD',
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  let body: {
    items?: { productId?: string; size?: string; quantity?: number }[]
    email?: string
    promoCode?: string
    shippingCountry?: string
  }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length || items.length > CART_LIMITS.maxLines) {
    return json(400, { error: 'invalid_cart' }, origin)
  }

  const sanitized = []
  let totalQuantity = 0
  for (const item of items) {
    const productId = typeof item.productId === 'string' ? item.productId : ''
    const size = typeof item.size === 'string' ? item.size.toUpperCase() : ''
    const quantity = Number(item.quantity)
    if (!CART_LIMITS.productIdPattern.test(productId) || !CART_LIMITS.sizes.includes(size as typeof CART_LIMITS.sizes[number])) {
      return json(400, { error: 'invalid_cart' }, origin)
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > CART_LIMITS.maxLineQuantity) {
      return json(400, { error: 'invalid_cart' }, origin)
    }
    totalQuantity += quantity
    sanitized.push({ productId, size, quantity })
  }
  if (totalQuantity > CART_LIMITS.maxTotalQuantity) return json(400, { error: 'invalid_cart' }, origin)

  const admin = serviceClient()
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

  const country = typeof body.shippingCountry === 'string' ? body.shippingCountry.trim().toUpperCase() : ''
  const zone = shippingZoneByCountry(country)
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

  const site = checkoutReturnOrigin(origin)
  const stripe = stripeClient()
  const lineItems = (order.lines as { name: string; productId: string; size: string; quantity: number; unitPriceCents: number }[]).map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: line.unitPriceCents,
      product_data: {
        name: PRODUCT_NAMES[line.productId] ?? line.name,
        description: line.size === 'U' ? 'Digipack' : `Taille ${line.size}`,
        metadata: { productId: line.productId, size: line.size },
      },
    },
  }))

  const discounts = []
  if (order.discountCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: order.discountCents,
      currency: 'eur',
      duration: 'once',
      max_redemptions: 1,
      metadata: { orderId: order.orderId },
    })
    discounts.push({ coupon: coupon.id })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      client_reference_id: userId ?? undefined,
      success_url: `${site}/commande?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/panier?canceled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: zone.countries,
      },
      shipping_options: [stripeShippingOption(zone)],
      line_items: lineItems,
      discounts: discounts.length ? discounts : undefined,
      metadata: { orderId: order.orderId },
      payment_intent_data: { metadata: { orderId: order.orderId } },
    })

    await admin.rpc('attach_stripe_session', {
      p_order_id: order.orderId,
      p_session_id: session.id,
    })

    if (!session.url) throw new Error('missing_checkout_url')
    return json(200, { url: session.url }, origin)
  } catch (error) {
    await admin.rpc('release_reservation', { p_order_id: order.orderId })
    console.error(error)
    return json(502, { error: 'stripe_unavailable' }, origin)
  }
})
