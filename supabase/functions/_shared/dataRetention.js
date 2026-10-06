const DAY_MS = 24 * 60 * 60 * 1000
export const REDACTED_RECIPIENT = 'retention-removed@invalid.invalid'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function retentionCutoffs(now = new Date()) {
  const yearsAgo = (years) => {
    const date = new Date(now)
    date.setUTCFullYear(date.getUTCFullYear() - years)
    return date.toISOString()
  }
  return {
    orders: new Date(now.getTime() - 90 * DAY_MS).toISOString(),
    emails: yearsAgo(1),
    withdrawals: yearsAgo(5),
  }
}

export function parseRetentionHolds(raw = '') {
  const values = raw.split(',').map((value) => value.trim()).filter(Boolean)
  if (values.some((value) => !UUID.test(value))) throw new Error('invalid_retention_hold')
  return new Set(values.map((value) => value.toLowerCase()))
}

export function canRemoveUnpaidOrder(order, session, blocked = false) {
  if (blocked || !['expired', 'canceled'].includes(order.status) || order.paid_at || order.stripe_payment_intent_id) return false
  if (!order.stripe_checkout_session_id) return true
  return Boolean(session && session.status === 'expired' && session.payment_status === 'unpaid')
}

/** Audit by default. Never calls Brevo or removes paid/refunded orders.
 * The existing maintenance endpoint performs authentication before calling this.
 */
export async function processRetention(admin, stripe, options = {}) {
  const { apply = false, now = new Date(), orderHolds = new Set(), optinHolds = new Set() } = options
  const cutoff = retentionCutoffs(now)
  const report = {
    mode: apply ? 'apply' : 'audit',
    eligible: { unpaidOrders: 0, sentEmailDetails: 0, withdrawnProofs: 0 },
    applied: { unpaidOrders: 0, sentEmailDetails: 0, withdrawnProofs: 0 },
    blockedOrders: 0,
    failed: 0,
    brevo: 'manual_review_required',
    paidOrderArchives: 'manual_review_required',
  }
  const check = (result) => {
    if (result.error) throw new Error('retention_database_error')
    return result.data ?? []
  }

  try {
    const orders = check(await admin.from('orders')
      .select('id, status, paid_at, stripe_payment_intent_id, stripe_checkout_session_id')
      .in('status', ['expired', 'canceled']).is('paid_at', null)
      .is('stripe_payment_intent_id', null).lt('created_at', cutoff.orders)
      .order('created_at', { ascending: true }).limit(200))
    for (const order of orders) {
      try {
        if (orderHolds.has(order.id)) { report.blockedOrders++; continue }
        // Never cascade-delete stock or financial traces that could still matter.
        const reservations = check(await admin.from('stock_reservations')
          .select('id').eq('order_id', order.id).neq('status', 'released').limit(1))
        const redemptions = check(await admin.from('promo_redemptions')
          .select('id').eq('order_id', order.id).limit(1))
        const outbox = check(await admin.from('order_email_outbox')
          .select('id').eq('order_id', order.id).limit(1))
        if (reservations.length || redemptions.length || outbox.length) { report.blockedOrders++; continue }
        const session = order.stripe_checkout_session_id
          ? await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id)
          : null
        if (!canRemoveUnpaidOrder(order, session)) { report.blockedOrders++; continue }
        report.eligible.unpaidOrders++
        if (apply) {
          const removed = check(await admin.from('orders').delete()
            .eq('id', order.id).eq('status', order.status).is('paid_at', null)
            .is('stripe_payment_intent_id', null).lt('created_at', cutoff.orders).select('id'))
          report.applied.unpaidOrders += removed.length
        }
      } catch { report.failed++ }
    }
    const emails = check(await admin.from('order_email_outbox')
      .select('id, order_id, sent_at').eq('status', 'sent')
      .neq('recipient', REDACTED_RECIPIENT).lt('sent_at', cutoff.emails)
      .order('sent_at', { ascending: true }).limit(200))
    for (const email of emails) {
      if (orderHolds.has(email.order_id)) continue
      report.eligible.sentEmailDetails++
      if (apply) {
        const changed = check(await admin.from('order_email_outbox')
          .update({ recipient: REDACTED_RECIPIENT, last_error: null, updated_at: now.toISOString() })
          .eq('id', email.id).eq('status', 'sent').eq('sent_at', email.sent_at).select('id'))
        report.applied.sentEmailDetails += changed.length
      }
    }
    const proofs = check(await admin.from('newsletter_optins')
      .select('id, unsubscribed_at, consent_at, confirmed_at, updated_at')
      .not('unsubscribed_at', 'is', null).lt('unsubscribed_at', cutoff.withdrawals)
      .is('pending_email', null).lt('expires_at', now.toISOString())
      .order('unsubscribed_at', { ascending: true }).limit(200))
    for (const proof of proofs) {
      if (optinHolds.has(proof.id) ||
          Date.parse(proof.consent_at) > Date.parse(proof.unsubscribed_at) ||
          (proof.confirmed_at && Date.parse(proof.confirmed_at) > Date.parse(proof.unsubscribed_at))) continue
      report.eligible.withdrawnProofs++
      if (apply) {
        const removed = check(await admin.from('newsletter_optins').delete()
          .eq('id', proof.id).eq('updated_at', proof.updated_at)
          .eq('unsubscribed_at', proof.unsubscribed_at).is('pending_email', null).select('id'))
        report.applied.withdrawnProofs += removed.length
      }
    }
  } catch { report.failed++ }
  return report
}
