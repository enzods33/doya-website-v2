import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'
import { serviceClient, stripeClient } from '../_shared/clients.ts'
import { isAllowedShippingAmount, SHIPPING_ZONES } from '../_shared/shipping.ts'

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
  const { data: isNew, error: eventError } = await admin.rpc('record_stripe_event', {
    p_event_id: event.id,
    p_event_type: event.type,
  })
  if (eventError) {
    console.error(eventError)
    return new Response('event_record_failed', { status: 500 })
  }
  if (!isNew) return new Response('ok', { status: 200 })

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid' && event.type === 'checkout.session.completed' && session.payment_status !== 'no_payment_required') {
        return new Response('ok', { status: 200 })
      }
      const orderId = session.metadata?.orderId
      if (!orderId) return new Response('missing_order', { status: 400 })

      const shippingCents = session.shipping_cost?.amount_total ?? 0
      if (!isAllowedShippingAmount(shippingCents)) {
        console.error('unexpected_shipping_amount', shippingCents, orderId)
        return new Response('invalid_shipping_amount', { status: 400 })
      }

      const address = session.shipping_details?.address ?? session.customer_details?.address
      const country = typeof address?.country === 'string' ? address.country.toUpperCase() : ''
      const zone = SHIPPING_ZONES.find((entry) => entry.amountCents === shippingCents)
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
      })
      if (error) throw error
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
      if (paymentIntent) {
        await admin.from('orders').update({ status: 'refunded' }).eq('stripe_payment_intent_id', paymentIntent)
      }
    }
  } catch (error) {
    console.error(error)
    return new Response('handler_failed', { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
