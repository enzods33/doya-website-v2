import test from 'node:test'
import assert from 'node:assert/strict'
import { canRemoveUnpaidOrder, parseRetentionHolds, processRetention, retentionCutoffs, REDACTED_RECIPIENT } from '../supabase/functions/_shared/dataRetention.js'

const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const oldOrder = { id, status: 'expired', paid_at: null, stripe_payment_intent_id: null, stripe_checkout_session_id: 'cs_old' }
const now = new Date('2026-10-06T06:00:00Z')

// Records queries and mutations without access to customer data.
function database(rows = {}, failures = {}) {
  const writes = []
  return {
    writes,
    from(table) {
      let operation = 'read', payload
      const conditions = []
      const chain = {
        select() { return chain },
        order() { return chain },
        limit() { return chain },
        eq(key, value) { conditions.push([key, value]); return chain },
        in() { return chain },
        is() { return chain },
        not() { return chain },
        neq() { return chain },
        lt() { return chain },
        delete() { operation = 'delete'; return chain },
        update(value) { operation = 'update'; payload = value; return chain },
        then(resolve) {
          if (operation !== 'read') writes.push({ table, operation, payload, conditions })
          return Promise.resolve({ data: operation === 'read' ? rows[table] ?? [] : [{ id }], error: failures[table] ?? null }).then(resolve)
        },
      }
      return chain
    },
  }
}
const stripe = (session) => ({ checkout: { sessions: { retrieve: async () => session } } })

test('calendar cutoffs and malformed legal holds fail closed', () => {
  assert.deepEqual(retentionCutoffs(now), {
    orders: '2026-07-08T06:00:00.000Z',
    emails: '2025-10-06T06:00:00.000Z',
    withdrawals: '2021-10-06T06:00:00.000Z',
  })
  assert.equal(parseRetentionHolds(id).has(id), true)
  assert.throws(() => parseRetentionHolds('not-a-uuid'))
})

test('paid, refunded, open, paid Stripe and held orders are never eligible', () => {
  const unpaid = { status: 'expired', payment_status: 'unpaid' }
  assert.equal(canRemoveUnpaidOrder(oldOrder, unpaid), true)
  for (const status of ['pending', 'paid', 'refunded']) {
    assert.equal(canRemoveUnpaidOrder({ ...oldOrder, status }, unpaid), false)
  }
  assert.equal(canRemoveUnpaidOrder({ ...oldOrder, paid_at: '2026-01-01' }, unpaid), false)
  assert.equal(canRemoveUnpaidOrder({ ...oldOrder, stripe_payment_intent_id: 'pi_paid' }, unpaid), false)
  assert.equal(canRemoveUnpaidOrder(oldOrder, { status: 'open', payment_status: 'unpaid' }), false)
  assert.equal(canRemoveUnpaidOrder(oldOrder, { status: 'expired', payment_status: 'paid' }), false)
  assert.equal(canRemoveUnpaidOrder(oldOrder, null), false)
  assert.equal(canRemoveUnpaidOrder(oldOrder, unpaid, true), false)
})

test('default audit detects candidates without writes', async () => {
  const db = database({
    orders: [oldOrder],
    newsletter_optins: [{ id, unsubscribed_at: '2020-01-01', consent_at: '2019-01-01', confirmed_at: '2019-01-02', updated_at: '2020-01-01' }],
  })
  const report = await processRetention(db, stripe({ status: 'expired', payment_status: 'unpaid' }), { now })
  assert.equal(report.mode, 'audit')
  assert.equal(report.eligible.unpaidOrders, 1)
  assert.equal(report.eligible.withdrawnProofs, 1)
  assert.deepEqual(db.writes, [])
})

test('explicit apply uses payment guards and preserves email deduplication rows', async () => {
  let read = 0
  const db = database({ orders: [oldOrder] })
  const base = db.from
  db.from = (table) => {
    if (table === 'order_email_outbox' && ++read === 2) {
      return database({ order_email_outbox: [{ id, order_id: id, sent_at: '2020-01-01' }] }).from(table)
    }
    return base(table)
  }
  const report = await processRetention(db, stripe({ status: 'expired', payment_status: 'unpaid' }), { now, apply: true })
  assert.equal(report.applied.unpaidOrders, 1)
  const removed = db.writes.find((write) => write.table === 'orders')
  assert.ok(removed.conditions.some(([key, value]) => key === 'status' && value === 'expired'))
  const emailDb = database({ order_email_outbox: [{ id, order_id: id, sent_at: '2020-01-01' }] })
  await processRetention(emailDb, stripe(null), { now, apply: true })
  assert.equal(emailDb.writes[0].operation, 'update')
  assert.equal(emailDb.writes[0].payload.recipient, REDACTED_RECIPIENT)
  assert.equal(emailDb.writes[0].payload.last_error, null)
  assert.ok(emailDb.writes[0].conditions.some(([key, value]) => key === 'status' && value === 'sent'))
})

test('holds, stock/financial traces and renewed consent block removal', async () => {
  for (const table of ['stock_reservations', 'promo_redemptions', 'order_email_outbox']) {
    const db = database({ orders: [oldOrder], [table]: [{ id, order_id: id }] })
    const report = await processRetention(db, stripe({ status: 'expired', payment_status: 'unpaid' }), { now, apply: true, orderHolds: new Set([id]) })
    assert.equal(report.eligible.unpaidOrders, 0)
    assert.equal(db.writes.length, 0)
    const withoutHold = database({ orders: [oldOrder], [table]: [{ id }] })
    const blocked = await processRetention(withoutHold, stripe({ status: 'expired', payment_status: 'unpaid' }), { now })
    assert.equal(blocked.blockedOrders, 1)
  }
  const db = database({ newsletter_optins: [{ id, unsubscribed_at: '2020-01-01', consent_at: '2026-01-01', confirmed_at: '2026-01-02' }] })
  const report = await processRetention(db, stripe(null), { now, apply: true })
  assert.equal(report.eligible.withdrawnProofs, 0)
  assert.equal(db.writes.length, 0)
})

test('database and Stripe errors are reported without deletion', async () => {
  const db = database({ orders: [oldOrder] })
  const brokenStripe = { checkout: { sessions: { retrieve: async () => { throw new Error('unavailable') } } } }
  const report = await processRetention(db, brokenStripe, { now, apply: true })
  assert.equal(report.failed, 1)
  assert.equal(db.writes.length, 0)
  const brokenDb = database({}, { orders: new Error('unavailable') })
  assert.equal((await processRetention(brokenDb, stripe(null), { now })).failed, 1)
})
