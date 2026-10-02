import type Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'
import { serviceClient } from './clients.ts'
import { queuePaidOrderEmail } from './orderNotifications.ts'

type AdminClient = ReturnType<typeof serviceClient>

export async function finalizePaidCheckout(
  admin: AdminClient,
  session: Stripe.Checkout.Session,
  explicitOrderId?: string,
) {
  const orderId = explicitOrderId || session.metadata?.orderId
  if (!orderId) throw new Error('missing_order')

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, status, shipping_cents, total_cents, shipping_zone_id')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError || !order) throw new Error('order_missing')

  if (order.status === 'paid') {
    await queuePaidOrderEmail(admin, orderId)
    return orderId
  }

  const shippingCents = session.shipping_cost?.amount_total ?? 0
  if (shippingCents !== order.shipping_cents) {
    console.error('shipping_amount_mismatch', shippingCents, order.shipping_cents, orderId)
    throw new Error('shipping_amount_mismatch')
  }

  const totalCents = typeof session.amount_total === 'number' ? session.amount_total : null
  if (totalCents === null || totalCents !== order.total_cents) {
    console.error('total_amount_mismatch', totalCents, order.total_cents, orderId)
    throw new Error('total_amount_mismatch')
  }

  const address = session.shipping_details?.address ?? session.customer_details?.address
  const country = typeof address?.country === 'string' ? address.country.toUpperCase() : ''

  if (order.shipping_zone_id) {
    const { data: zone, error: zoneError } = await admin
      .from('shipping_zones')
      .select('id, countries')
      .eq('id', order.shipping_zone_id)
      .maybeSingle()

    if (zoneError || !zone) throw new Error('shipping_zone_missing')
    if (country && !zone.countries.includes(country)) {
      console.error('shipping_country_mismatch', country, zone.id, orderId)
      throw new Error('shipping_country_mismatch')
    }
  }

  const { error } = await admin.rpc('mark_order_paid_from_stripe', {
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
  if (error) throw error

  await queuePaidOrderEmail(admin, orderId)
  return orderId
}
