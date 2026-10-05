import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { DOYA_CONTACT_EMAIL } from '../src/config/contact.js'

const source = readFileSync(new URL('../supabase/functions/subscribe-newsletter/index.ts', import.meta.url), 'utf8')
const handlerSource = stripTypeScriptTypes(source.replace(/^import[^\r\n]*\r?\n/gm, ''))

function newsletterSandbox(site, sender = DOYA_CONTACT_EMAIL) {
  const writes = []
  const emails = []
  let handler
  const env = {
    BREVO_API_KEY: 'cle-factice-sans-acces', BREVO_LIST_ID: '99',
    BREVO_DOI_TEMPLATE_ID: '5', BREVO_UNSUBSCRIBE_SECRET: 'secret-factice-local',
    BREVO_SENDER_EMAIL: sender, BREVO_SENDER_NAME: 'DOYA',
  }
  runInNewContext(handlerSource, {
    Request, Response, URL, crypto, TextEncoder, btoa, console, DOYA_CONTACT_EMAIL,
    Deno: { env: { get: (name) => env[name] }, serve: (callback) => { handler = callback } },
    preflight: () => null, rejectOrigin: () => null,
    publicSiteUrl: () => site,
    json: (status, body) => new Response(JSON.stringify(body), { status }),
    clientIp: () => 'adresse-factice', privateRateKey: async () => 'hash-factice',
    allowRatePersistent: async () => true, newsletterAddressHash: async () => 'hash-email-factice',
    serviceClient: () => ({ from: (table) => ({
      delete: () => ({ is: () => ({ lt: async () => ({ error: null }) }) }),
      upsert: async (data) => {
      assert.equal(table, 'newsletter_optins')
      writes.push(data)
      return { error: null }
    } }) }),
    fetch: async (url, options) => {
      if (url.startsWith('https://api.brevo.com/v3/contacts/')) {
        return new Response('{}', { status: 404 })
      }
      assert.equal(url, 'https://api.brevo.com/v3/smtp/email')
      emails.push(JSON.parse(options.body))
      return new Response('{}', { status: 201 })
    },
  })
  return { submit: () => handler(new Request(`${site}/`, {
    method: 'POST', headers: { 'content-type': 'application/json', origin: site },
    body: JSON.stringify({ email: 'client@example.invalid', locale: 'fr', source: 'footer' }),
  })), writes, emails }
}

for (const site of ['https://doya.guzzler-bot.cloud', 'https://doyaofficial.com']) {
  test(`le double opt-in utilise l'expéditeur DOYA et le domaine primaire ${site}`, async () => {
    const simulated = newsletterSandbox(site)
    assert.equal((await simulated.submit()).status, 200)
    assert.equal(simulated.writes.length, 1)
    assert.equal(simulated.emails.length, 1)
    const email = simulated.emails[0]
    assert.equal(email.templateId, 5)
    assert.equal(email.sender.email, DOYA_CONTACT_EMAIL)
    assert.equal(email.sender.name, 'DOYA')
    assert.equal(email.replyTo.email, DOYA_CONTACT_EMAIL)
    assert.equal(email.to[0].email, 'client@example.invalid')
    assert.ok(email.params.confirmation_url.startsWith(`${site}/newsletter-confirmation?token=`))
  })
}

test('un expéditeur manquant bloque le double opt-in avant toute inscription ou envoi', async () => {
  const simulated = newsletterSandbox('https://doyaofficial.com', '')
  assert.equal((await simulated.submit()).status, 503)
  assert.equal(simulated.writes.length, 0)
  assert.equal(simulated.emails.length, 0)
})
