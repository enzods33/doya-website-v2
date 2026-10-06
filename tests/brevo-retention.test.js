import test from 'node:test'
import assert from 'node:assert/strict'
import { auditBrevoRetention, classifyBrevoContact } from '../supabase/functions/_shared/brevoRetention.js'
const now = new Date('2026-10-06T06:00:00Z')

test('Brevo review distinguishes recent, old and unverifiable dates without guessing activity', () => {
  assert.equal(classifyBrevoContact({ createdAt: '2026-01-01' }, now), 'recent')
  assert.equal(classifyBrevoContact({ createdAt: '2020-01-01', modifiedAt: now.toISOString() }, now), 'needsReview')
  assert.equal(classifyBrevoContact({ createdAt: 'invalid' }, now), 'unknown')
  assert.equal(classifyBrevoContact({ createdAt: '2030-01-01' }, now), 'unknown')
})

test('Brevo audit returns counts only and uses read-only requests', async () => {
  const calls = []
  const report = await auditBrevoRetention({ apiKey: 'test-key', listId: 1, now, request: async (url, options) => {
    calls.push({ url, options })
    return { ok: true, json: async () => ({ contacts: [
      { email: 'private@example.invalid', createdAt: '2026-01-01' },
      { email: 'old@example.invalid', createdAt: '2020-01-01' },
    ] }) }
  } })
  assert.equal(report.total, 2)
  assert.equal(report.recent, 1)
  assert.equal(report.needsReview, 1)
  assert.equal(report.failed, 0)
  assert.equal(report.complete, true)
  assert.equal(JSON.stringify(report).includes('@'), false)
  assert.equal(calls[0].options.method, undefined)
})

test('Brevo failure does not produce a successful audit', async () => {
  const report = await auditBrevoRetention({ apiKey: 'test-key', listId: 1, now, request: async () => ({ ok: false }) })
  assert.equal(report.failed, 1)
  assert.equal(report.complete, false)
})
