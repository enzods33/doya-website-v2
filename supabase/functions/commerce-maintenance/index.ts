import { serviceClient, stripeClient } from '../_shared/clients.ts'
import { finalizePaidCheckout } from '../_shared/checkoutPayment.ts'
import { processDueOrderEmails } from '../_shared/orderNotifications.ts'

const STALE_AFTER_MS = 40 * 60 * 1000
const MAX_RECONCILE = 20

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method_not_allowed', { status: 405 })
  }

  const admin = serviceClient()
  const token = req.headers.get('x-doya-maintenance-token') ?? ''
  const { data: valid, error: tokenError } = await admin.rpc('verify_commerce_maintenance_token', {
    p_token: token,
  })
  if (tokenError || valid !== true) {
    return new Response('unauthorized', { status: 401 })
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString()
  const { data: pending, error: pendingError } = await admin
    .from('orders')
    .select('id, stripe_checkout_session_id, created_at')
    .eq('status', 'pending')
    .not('stripe_checkout_session_id', 'is', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(MAX_RECONCILE)

  if (pendingError) {
    console.error('maintenance_pending_lookup_failed', pendingError)
    return new Response('lookup_failed', { status: 500 })
  }

  const stripe = stripeClient()
  let paid = 0
  let released = 0
  let untouched = 0
  let failed = 0

  for (const order of pending ?? []) {
    const sessionId = order.stripe_checkout_session_id
    if (!sessionId) continue

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
        await finalizePaidCheckout(admin, session, order.id)
        paid += 1
        continue
      }

      if (session.status === 'expired') {
        const { error } = await admin.rpc('release_reservation', { p_order_id: order.id })
        if (error) throw error
        released += 1
        continue
      }

      untouched += 1
    } catch (error) {
      failed += 1
      console.error('maintenance_reconcile_failed', order.id, sessionId, error)
    }
  }

  const emails = await processDueOrderEmails(admin, 20)

  // Donnée personnelle temporaire du double opt-in : ne jamais garder
  // l'adresse au-delà de la fenêtre de confirmation si le welcome n'a pas pu partir.
  const nowIso = new Date().toISOString()
  const { error: expiredOptinError } = await admin
    .from('newsletter_optins')
    .delete()
    .is('confirmed_at', null)
    .lt('expires_at', nowIso)
  if (expiredOptinError) console.error('newsletter_optin_cleanup_failed', expiredOptinError)

  const { error: confirmedOptinError } = await admin
    .from('newsletter_optins')
    .update({ pending_email: null, updated_at: nowIso })
    .not('confirmed_at', 'is', null)
    .is('welcome_sent_at', null)
    .lt('expires_at', nowIso)
  if (confirmedOptinError) console.error('newsletter_optin_pii_cleanup_failed', confirmedOptinError)

  return new Response(JSON.stringify({
    ok: true,
    reconciled: { paid, released, untouched, failed },
    emails,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
