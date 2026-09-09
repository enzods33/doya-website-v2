import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'
import { serviceClient, stripeClient } from '../_shared/clients.ts'
import { sendPaidOrderEmails, type OrderEmailLine } from '../_shared/orderEmail.ts'
import { isAllowedShippingAmount, loadShippingZones } from '../_shared/shipping.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 })

  const signature = req.headers.get('stripe-signature')
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!signature || !secret) return new Response('webhook_unconfigured', { status: 500 })

  const raw = await req.text()
  const stripe = stripeClient()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(raw, signature, secret)
  } catch (error) {
    console.error(error)
    return new Response('invalid_signature', { status: 400 })
  }

  const admin = serviceClient()

  // Déjà traité avec succès → no-op (évite le double travail).
  const { data: seen } = await admin
    .from('processed_stripe_events')
    .select('event_id')
    .eq('event_id', event.id)
    .maybeSingle()
  if (seen) return new Response('ok', { status: 200 })

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid' && event.type === 'checkout.session.completed' && session.payment_status !== 'no_payment_required') {
        // Session non payée : on enregistre quand même pour ne pas retravailler l’event.
        await markProcessed(admin, event)
        return new Response('ok', { status: 200 })
      }
      const orderId = session.metadata?.orderId
      if (!orderId) {
        console.error('missing_order', event.id)
        return new Response('missing_order', { status: 400 })
      }

      const shippingCents = session.shipping_cost?.amount_total ?? 0
      const shippingZones = await loadShippingZones(admin)
      if (!isAllowedShippingAmount(shippingCents, shippingZones)) {
        console.error('unexpected_shipping_amount', shippingCents, orderId)
        return new Response('invalid_shipping_amount', { status: 400 })
      }

      const address = session.shipping_details?.address ?? session.customer_details?.address
      const country = typeof address?.country === 'string' ? address.country.toUpperCase() : ''
      const zone = shippingZones.find((entry) => entry.amountCents === shippingCents)
      if (zone && country && !zone.countries.includes(country)) {
        console.error('shipping_country_mismatch', country, zone.id, orderId)
        return new Response('shipping_country_mismatch', { status: 400 })
      }

      const { error } = await admin.rpc('mark_order_paid_from_stripe', {
        p_order_id: orderId,
        p_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
        p_shipping_name: session.shipping_details?.name ?? session.customer_details?.name ?? null,
        p_shipping_address: address ?? null,
        p_shipping_cents: shippingCents,
        p_total_cents: typeof session.amount_total === 'number' ? session.amount_total : null,
        p_shipping_phone: session.customer_details?.phone ?? null,
      })
      if (error) throw error

      // Mails confirmation (client + atelier). Échec mail ≠ échec paiement.
      try {
        await notifyPaidOrder(admin, orderId)
      } catch (mailError) {
        console.error('order_email_failed', mailError)
      }
    }

    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.orderId
      if (orderId) {
        const { error } = await admin.rpc('release_reservation', { p_order_id: orderId })
        if (error) throw error
      }
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
      // charge.refunded === true seulement si remboursement total ; sinon partiel → pas de restock.
      if (paymentIntent && charge.refunded) {
        const { error } = await admin.rpc('restock_order_from_refund', {
          p_payment_intent: paymentIntent,
          p_amount_refunded: charge.amount_refunded ?? 0,
          p_charge_amount: charge.amount ?? 0,
        })
        if (error) throw error
      } else if (paymentIntent) {
        console.info('partial_refund_skip_restock', paymentIntent, charge.amount_refunded, charge.amount)
      }
    }
  } catch (error) {
    // Pas d’enregistrement → Stripe peut retenter.
    console.error(error)
    return new Response('handler_failed', { status: 500 })
  }

  // Succès seulement : marque l’event pour bloquer les retries no-op.
  await markProcessed(admin, event)
  return new Response('ok', { status: 200 })
})

async function notifyPaidOrder(
  admin: ReturnType<typeof serviceClient>,
  orderId: string,
) {
  const { data: order, error } = await admin
    .from('orders')
    .select('order_number, email, shipping_name, shipping_phone, shipping_address, subtotal_cents, discount_cents, shipping_cents, total_cents, promo_code, order_items (product_id, size, quantity, unit_price_cents)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order?.order_number) {
    console.error('order_email_lookup_failed', error)
    return
  }

  const productIds = [...new Set((order.order_items ?? []).map((item: { product_id: string }) => item.product_id))]
  const { data: products } = productIds.length
    ? await admin.from('products').select('id, name').in('id', productIds)
    : { data: [] as { id: string; name: string }[] }
  const names = new Map((products ?? []).map((row) => [row.id, row.name]))

  const lines: OrderEmailLine[] = (order.order_items ?? []).map((item: {
    product_id: string
    size: string
    quantity: number
    unit_price_cents: number
  }) => ({
    name: names.get(item.product_id) ?? item.product_id,
    size: item.size,
    quantity: item.quantity,
    unitPriceCents: item.unit_price_cents,
  }))

  await sendPaidOrderEmails({
    orderNumber: order.order_number,
    email: order.email,
    shippingName: order.shipping_name,
    shippingPhone: order.shipping_phone ?? null,
    shippingAddress: (order.shipping_address as Record<string, unknown> | null) ?? null,
    subtotalCents: order.subtotal_cents,
    discountCents: order.discount_cents,
    shippingCents: order.shipping_cents,
    totalCents: order.total_cents,
    promoCode: order.promo_code,
    lines,
  })
}

async function markProcessed(
  admin: ReturnType<typeof serviceClient>,
  event: Stripe.Event,
) {
  const { error } = await admin.rpc('record_stripe_event', {
    p_event_id: event.id,
    p_event_type: event.type,
  })
  if (error) {
    // Traitement déjà fait : un échec d’idempotence ne doit pas faire retenter
    // le handler (risque faible). On logue seulement.
    console.error('record_stripe_event_failed', error)
  }
}
