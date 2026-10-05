import test from 'node:test'
import assert from 'node:assert/strict'
import { sendPaidOrderEmails, sendShippedOrderEmail } from '../supabase/functions/_shared/orderEmail.ts'
import { sendNewsletterWelcome } from '../supabase/functions/_shared/newsletterWelcome.ts'
import { DOYA_CONTACT_EMAIL } from '../src/config/contact.js'
import { DOYA_CONTACT_EMAIL as edgeContactEmail } from '../supabase/functions/_shared/emailIdentity.ts'

test('une vente notifie le vendeur configuré et conserve la confirmation client séparée', async () => {
  const originalDeno = globalThis.Deno
  const originalFetch = globalThis.fetch
  let payload
  globalThis.Deno = { env: { get: (name) => ({
    BREVO_API_KEY: 'cle-factice-sans-acces',
    BREVO_SENDER_EMAIL: 'sender@example.invalid',
    ORDER_NOTIFY_EMAIL: 'doyamusicofficial@gmail.com',
  })[name] } }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email')
    payload = JSON.parse(options.body)
    // Aucune requête réseau : la réponse de Brevo est simulée.
    return new Response('{}', { status: 201 })
  }
  try {
    const order = {
      orderNumber: 'SIMULATION-001', email: 'client@example.invalid', locale: 'fr',
      lines: [], subtotalCents: 1000, discountCents: 0, shippingCents: 0, totalCents: 1000,
    }
    assert.equal(await sendPaidOrderEmails(order, 'test-local'), true)
    assert.equal(payload.messageVersions.length, 2)
    assert.deepEqual(payload.messageVersions[0].to, [{ email: order.email }])
    assert.deepEqual(payload.messageVersions[1].to, [{ email: 'doyamusicofficial@gmail.com' }])
    assert.match(payload.messageVersions[1].subject, /Nouvelle commande SIMULATION-001/)
    assert.match(payload.messageVersions[1].htmlContent, /Nouvelle commande payée/)
    assert.doesNotMatch(payload.messageVersions[0].htmlContent, /Nouvelle commande payée/)
    assert.equal(payload.headers.idempotencyKey, 'test-local')
    assert.deepEqual(payload.replyTo, { email: 'doyamusicofficial@gmail.com' })
    assert.match(payload.messageVersions[0].htmlContent, /mailto:doyamusicofficial@gmail.com/)
    assert.doesNotMatch(payload.messageVersions[0].htmlContent, /almenaprod@gmail.com/)
    assert.equal(await sendPaidOrderEmails({ ...order, email: 'doyamusicofficial@gmail.com' }), true)
    assert.equal(payload.messageVersions.length, 1)
  } finally {
    globalThis.Deno = originalDeno
    globalThis.fetch = originalFetch
  }
})

test('newsletter : identité DOYA cohérente et réponses sur la boîte publique', async () => {
  assert.equal(DOYA_CONTACT_EMAIL, 'doyamusicofficial@gmail.com')
  assert.equal(edgeContactEmail, DOYA_CONTACT_EMAIL)
  const originalDeno = globalThis.Deno
  const originalFetch = globalThis.fetch
  let payload
  globalThis.Deno = { env: { get: (name) => ({
    BREVO_API_KEY: 'cle-factice-sans-acces',
    BREVO_SENDER_EMAIL: DOYA_CONTACT_EMAIL,
    BREVO_SENDER_NAME: 'DOYA',
  })[name] } }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email')
    payload = JSON.parse(options.body)
    return new Response('{}', { status: 201 })
  }
  try {
    assert.equal(await sendNewsletterWelcome('client@example.invalid', 'fr', 'newsletter-locale'), true)
    assert.deepEqual(payload.sender, { name: 'DOYA', email: DOYA_CONTACT_EMAIL })
    assert.deepEqual(payload.replyTo, { email: DOYA_CONTACT_EMAIL })
    assert.deepEqual(payload.to, [{ email: 'client@example.invalid' }])
    assert.equal(payload.headers.idempotencyKey, 'newsletter-locale')
  } finally {
    globalThis.Deno = originalDeno
    globalThis.fetch = originalFetch
  }
})

test('une expédition notifie uniquement le client avec le suivi et refuse un suivi vide', async () => {
  const originalDeno = globalThis.Deno
  const originalFetch = globalThis.fetch
  const payloads = []
  globalThis.Deno = { env: { get: (name) => ({
    BREVO_API_KEY: 'cle-factice-sans-acces',
    BREVO_SENDER_EMAIL: 'sender@example.invalid',
    ORDER_NOTIFY_EMAIL: 'doyamusicofficial@gmail.com',
  })[name] } }
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.brevo.com/v3/smtp/email')
    payloads.push(JSON.parse(options.body))
    return new Response('{}', { status: 201 })
  }
  try {
    const order = {
      orderNumber: 'SIMULATION-002', email: 'client@example.invalid', locale: 'fr',
      lines: [], subtotalCents: 1000, discountCents: 0, shippingCents: 0, totalCents: 1000,
      trackingNumber: '  SUIVI-LOCAL-002  ',
    }
    assert.equal(await sendShippedOrderEmail(order, 'expedition-locale'), true)
    assert.deepEqual(payloads[0].to, [{ email: order.email }])
    assert.match(payloads[0].subject, /Expédition SIMULATION-002/)
    assert.match(payloads[0].htmlContent, /SUIVI-LOCAL-002/)
    assert.match(payloads[0].htmlContent, /mailto:doyamusicofficial@gmail.com/)
    assert.deepEqual(payloads[0].replyTo, { email: 'doyamusicofficial@gmail.com' })
    assert.equal(payloads[0].headers.idempotencyKey, 'expedition-locale')
    assert.equal(await sendShippedOrderEmail({ ...order, trackingNumber: '   ' }), false)
    assert.equal(payloads.length, 1)
  } finally {
    globalThis.Deno = originalDeno
    globalThis.fetch = originalFetch
  }
})
