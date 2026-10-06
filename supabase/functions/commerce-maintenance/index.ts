import { auditBrevoRetention } from '../_shared/brevoRetention.js'
import { parseRetentionHolds, processRetention } from '../_shared/dataRetention.js'
import { serviceClient, stripeClient } from '../_shared/clients.ts'
import { finalizePaidCheckout } from '../_shared/checkoutPayment.ts'
import { processDueOrderEmails } from '../_shared/orderNotifications.ts'
import { sendNewsletterWelcome } from '../_shared/newsletterWelcome.ts'

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

  const body = await req.json().catch(() => ({})) as { retentionApply?: boolean; brevoAudit?: boolean; archiveOrders?: boolean }

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

  const rateLimitCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
  const { error: rateLimitCleanupError } = await admin
    .from('api_rate_limits')
    .delete()
    .lt('window_start', rateLimitCutoff)
  if (rateLimitCleanupError) console.error('rate_limit_cleanup_failed', rateLimitCleanupError)

  // Welcome DOI : un échec Brevo ne doit pas perdre le mail après confirmation.
  const nowIso = new Date().toISOString()
  let welcomeSent = 0
  let welcomeFailed = 0
  const { data: pendingWelcomes, error: pendingWelcomesError } = await admin
    .from('newsletter_optins')
    .select('id, pending_email, locale, confirmed_at')
    .not('confirmed_at', 'is', null)
    .is('welcome_sent_at', null)
    .not('pending_email', 'is', null)
    .gt('expires_at', nowIso)
    .order('confirmed_at', { ascending: true })
    .limit(10)

  if (pendingWelcomesError) {
    console.error('newsletter_welcome_retry_lookup_failed', pendingWelcomesError)
  } else {
    for (const row of pendingWelcomes ?? []) {
      const email = typeof row.pending_email === 'string' ? row.pending_email.trim().toLowerCase() : ''
      if (!email) continue
      const sent = await sendNewsletterWelcome(email, row.locale, row.id)
      if (sent) {
        welcomeSent += 1
        const { error } = await admin
          .from('newsletter_optins')
          .update({
            pending_email: null,
            welcome_sent_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        if (error) console.error('newsletter_welcome_retry_state_failed', row.id, error)
      } else {
        welcomeFailed += 1
        const { error } = await admin
          .from('newsletter_optins')
          .update({ last_error: 'brevo_welcome_failed', updated_at: new Date().toISOString() })
          .eq('id', row.id)
        if (error) console.error('newsletter_welcome_retry_error_state_failed', row.id, error)
      }
    }
  }

  // Donnée personnelle temporaire du double opt-in : ne jamais garder
  // l'adresse au-delà de la fenêtre de confirmation si le welcome n'a pas pu partir.
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

  // New retention rules are audit-only until explicitly activated.
  let retention
  try {
    retention = await processRetention(admin, stripe, {
      apply: typeof body.retentionApply === 'boolean' ? body.retentionApply : Deno.env.get('DOYA_RETENTION_MODE') === 'apply',
      orderHolds: parseRetentionHolds(Deno.env.get('DOYA_RETENTION_HOLD_ORDER_IDS') ?? ''),
      optinHolds: parseRetentionHolds(Deno.env.get('DOYA_RETENTION_HOLD_OPTIN_IDS') ?? ''),
    })
  } catch {
    retention = { mode: 'blocked', failed: 1 }
  }
  let brevoRetention
  let orderArchives
  if (body.brevoAudit === true) brevoRetention = await auditBrevoRetention()
  if (body.archiveOrders === true) {
    const { data, error } = await admin.rpc('archive_completed_orders', { p_limit: 100 })
    orderArchives = error ? { failed: 1 } : data
  }
  const maintenanceFailed = retention.failed > 0 || (brevoRetention?.failed ?? 0) > 0 || (orderArchives?.failed ?? 0) > 0
  if (maintenanceFailed) console.error('retention_maintenance_failed')

  return new Response(JSON.stringify({
    ok: !maintenanceFailed,
    brevoRetention,
    orderArchives,
    retention,
    reconciled: { paid, released, untouched, failed },
    emails,
    newsletterWelcomes: { sent: welcomeSent, failed: welcomeFailed },
  }), {
    status: maintenanceFailed ? 500 : 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

