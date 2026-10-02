import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'
import { serviceClient, stripeClient } from './clients.ts'

type AdminClient = ReturnType<typeof serviceClient>

export async function finalizePaidCheckout(
  admin: AdminClient,
  session: Stripe.Checkout.Session,
): Promise<string> {
  const orderId = session.metadata?.orderId
  if (!orderId) throw new Error('missing_order')

  const { data: order, error } = await admin
    .from('orders')
    .select('id, status, shipping_cents, total_cents, shipping_zone_id, shipping_zone_countries')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) throw error ?? new Error('order_missing')
  if (order.status === 'paid') return orderId
  if (order.status !== 'pending') throw new Error('order_not_pending')

  const shippingCents = session.shipping_cost?.amount_total ?? 0
  const totalCents = session.amount_total
  if (!Number.isInteger(totalCents)) throw new Error('missing_total_amount')
  if (shippingCents !== order.shipping_cents) throw new Error('unexpected_shipping_amount')
  if (totalCents !== order.total_cents) throw new Error('unexpected_total_amount')

  const address = session.shipping_details?.address ?? session.customer_details?.address
  const country = typeof address?.country === 'string' ? address.country.trim().toUpperCase() : ''
  const allowedCountries = Array.isArray(order.shipping_zone_countries)
    ? order.shipping_zone_countries.map((value: unknown) => String(value).trim().toUpperCase()).filter(Boolean)
    : []
  if (country && allowedCountries.length && !allowedCountries.includes(country)) {
    throw new Error('shipping_country_mismatch')
  }

  const { error: paidError } = await admin.rpc('mark_order_paid_from_stripe', {
    p_order_id: orderId,
    p_payment_intent: typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null,
    p_shipping_name: session.shipping_details?.name ?? session.customer_details?.name ?? null,
    p_shipping_address: address ?? null,
    p_shipping_cents: shippingCents,
    p_total_cents: totalCents,
    p_shipping_phone: session.customer_details?.phone ?? null,
  })
  if (paidError) throw paidError

  return orderId
}

export async function reconcileStaleCheckoutSessions(
  admin: AdminClient,
  stripe = stripeClient(),
  limit = 4,
): Promise<{ paid: number; released: number }> {
  const cutoff = new Date(Date.now() - 40 * 60 * 1000).toISOString()
  const { data: orders, error } = await admin
    .from('orders')
    .select('id, stripe_checkout_session_id')
    .eq('status', 'pending')
    .not('stripe_checkout_session_id', 'is', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error || !orders?.length) return { paid: 0, released: 0 }

  let paid = 0
  let released = 0
  for (const order of orders) {
    const sessionId = typeof order.stripe_checkout_session_id === 'string'
      ? order.stripe_checkout_session_id
      : ''
    if (!sessionId) continue

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
        await finalizePaidCheckout(admin, session)
        paid += 1
        continue
      }
      if (session.status === 'expired') {
        const { error: releaseError } = await admin.rpc('release_reservation', { p_order_id: order.id })
        if (releaseError) throw releaseError
        released += 1
      }
    } catch (error) {
      console.error('checkout_reconcile_failed', sessionId, error)
    }
  }

  return { paid, released }
}
