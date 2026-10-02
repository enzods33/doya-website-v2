import test from 'node:test'
import assert from 'node:assert/strict'
import { checkoutReleaseAction } from '../supabase/functions/_shared/checkoutRelease.ts'
import { signNewsletterAddress, verifyNewsletterAddress } from '../supabase/functions/_shared/newsletterUnsubscribe.ts'
import { hashNewsletterToken, newOpaqueNewsletterToken } from '../supabase/functions/_shared/newsletterTokens.ts'
import { prepareBioImage } from '../src/commerce/prepareBioImage.js'

test('une session Stripe ouverte doit expirer avant la libération du stock', () => {
  assert.equal(checkoutReleaseAction('open'), 'expire')
  assert.equal(checkoutReleaseAction('expired'), 'release')
  assert.equal(checkoutReleaseAction('complete'), 'wait')
  assert.equal(checkoutReleaseAction(null), 'wait')
})

test('un lien de désabonnement n’autorise que son adresse et résiste aux altérations', async () => {
  const secret = 'secret-de-test-suffisamment-long'
  const token = await signNewsletterAddress('FAN@EXAMPLE.COM', secret)
  assert.equal(await verifyNewsletterAddress(token, secret), 'fan@example.com')
  assert.equal(await verifyNewsletterAddress(token, 'autre-cle'), null)
  const [payload, signature] = token.split('.')
  assert.equal(await verifyNewsletterAddress(`${payload.slice(0, -1)}A.${signature}`, secret), null)
  assert.equal(await verifyNewsletterAddress('', secret), null)
})

test('les nouveaux liens newsletter utilisent des tokens opaques non réversibles', async () => {
  const first = newOpaqueNewsletterToken()
  const second = newOpaqueNewsletterToken()
  assert.match(first, /^[A-Za-z0-9_-]{43}$/)
  assert.match(second, /^[A-Za-z0-9_-]{43}$/)
  assert.notEqual(first, second)

  const firstHash = await hashNewsletterToken(first)
  const secondHash = await hashNewsletterToken(second)
  assert.match(firstHash, /^[a-f0-9]{64}$/)
  assert.match(secondHash, /^[a-f0-9]{64}$/)
  assert.notEqual(firstHash, secondHash)
  assert.doesNotMatch(first, /@|example|fan/i)
})

test('la préparation produit garde alpha en WebP, la bio reste JPEG', async () => {
  const originalImage = globalThis.Image
  const originalDocument = globalThis.document
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  globalThis.Image = class {
    naturalWidth = 800
    naturalHeight = 1000
    set src(_value) { queueMicrotask(() => this.onload()) }
  }
  globalThis.document = { createElement: () => ({
    getContext: () => ({ drawImage() {} }),
    toBlob(callback, mime) { callback(new Blob(['image'], { type: mime })) },
  }) }
  URL.createObjectURL = () => 'blob:mock'
  URL.revokeObjectURL = () => {}
  try {
    const source = new File(['png'], 'tee.png', { type: 'image/png' })
    const product = await prepareBioImage(source, { product: true })
    assert.equal(product.file.type, 'image/webp')
    assert.match(product.file.name, /\.webp$/)
    const bio = await prepareBioImage(source)
    assert.equal(bio.file.type, 'image/jpeg')
  } finally {
    globalThis.Image = originalImage
    globalThis.document = originalDocument
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  }
})
