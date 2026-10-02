import Stripe from 'https://esm.sh/stripe@17.4.0?target=deno'
import { serviceClient, stripeClient } from '../_shared/clients.ts'
import { finalizePaidCheckout } from '../_shared/checkoutPayment.ts'
import { processDueOrderEmails } from '../_shared/orderNotifications.ts'

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
  let eventRecorded = false

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

      const finalizedOrderId = await finalizePaidCheckout(admin, session, orderId)

      // Enregistrer l'événement avant les tentatives d'e-mail. Les confirmations
      // restent dans l'outbox si Brevo est temporairement indisponible.
      const firstProcessing = await markProcessed(admin, event)
      eventRecorded = true
      if (firstProcessing) {
        await processDueOrderEmails(admin, 10)
      }
      console.info('checkout_paid_finalized', finalizedOrderId)
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

    // Succès seulement : marque l’event pour bloquer les retries no-op.
    if (!eventRecorded) await markProcessed(admin, event)
  } catch (error) {
    // Pas d’enregistrement → Stripe peut retenter.
    console.error(error)
    return new Response('handler_failed', { status: 500 })
  }

  return new Response('ok', { status: 200 })
})

async function markProcessed(
  admin: ReturnType<typeof serviceClient>,
  event: Stripe.Event,
): Promise<boolean> {
  const { data, error } = await admin.rpc('record_stripe_event', {
    p_event_id: event.id,
    p_event_type: event.type,
  })
  if (error) throw error
  return data === true
}
