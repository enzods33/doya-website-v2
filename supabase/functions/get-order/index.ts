import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { serviceClient, stripeClient } from '../_shared/clients.ts'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  let sessionId = ''
  try {
    const body = await req.json()
    sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return json(400, { error: 'invalid_session' }, origin)
  }

  try {
    const session = await stripeClient().checkout.sessions.retrieve(sessionId)
    if (!session?.id) return json(404, { error: 'not_found' }, origin)

    const admin = serviceClient()
    const { data: order, error } = await admin
      .from('orders')
      .select('id, status, email, subtotal_cents, discount_cents, shipping_cents, total_cents, promo_code, paid_at, shipping_name, order_items (product_id, size, quantity, unit_price_cents)')
      .eq('stripe_checkout_session_id', session.id)
      .maybeSingle()

    if (error || !order) return json(404, { error: 'not_found' }, origin)
    if (session.payment_status !== 'paid' && order.status !== 'paid') {
      return json(200, { status: order.status, paid: false }, origin)
    }

    return json(200, {
      status: order.status,
      paid: order.status === 'paid',
      email: order.email,
      subtotalCents: order.subtotal_cents,
      discountCents: order.discount_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
      promoCode: order.promo_code,
      paidAt: order.paid_at,
      shippingName: order.shipping_name,
      items: order.order_items,
    }, origin)
  } catch (error) {
    console.error(error)
    return json(502, { error: 'lookup_failed' }, origin)
  }
})
