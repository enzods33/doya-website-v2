import test from 'node:test'
import assert from 'node:assert/strict'
import { checkoutReleaseAction } from '../supabase/functions/_shared/checkoutRelease.ts'
import { signNewsletterAddress, verifyNewsletterAddress } from '../supabase/functions/_shared/newsletterUnsubscribe.ts'
import { newsletterMessageVersions } from '../supabase/functions/_shared/newsletterDelivery.ts'
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

test('une newsletter sépare les adresses et donne à chaque abonné son lien', async () => {
  const versions = await newsletterMessageVersions(
    ['a@example.com', 'b@example.com'], '<html><body><p>Bonjour</p></body></html>',
    'https://doya.example', 'secret', 'fr',
  )
  assert.deepEqual(versions.map((version) => version.to), [[{ email: 'a@example.com' }], [{ email: 'b@example.com' }]])
  const first = versions[0].htmlContent.match(/token=([^"&]+)/)?.[1]
  const second = versions[1].htmlContent.match(/token=([^"&]+)/)?.[1]
  assert.notEqual(first, second)
  assert.equal(await verifyNewsletterAddress(decodeURIComponent(first), 'secret'), 'a@example.com')
  assert.equal(await verifyNewsletterAddress(decodeURIComponent(second), 'secret'), 'b@example.com')
  assert.doesNotMatch(versions[0].htmlContent, /b@example.com/)
  const ja = await newsletterMessageVersions(
    ['a@example.com'], '<html><body><p>こんにちは</p></body></html>',
    'https://doya.example', 'secret', 'ja',
  )
  const zh = await newsletterMessageVersions(
    ['a@example.com'], '<html><body><p>你好</p></body></html>',
    'https://doya.example', 'secret', 'zh',
  )
  assert.match(ja[0].htmlContent, /配信停止/)
  assert.match(zh[0].htmlContent, /退订/)
  await assert.rejects(() => newsletterMessageVersions(Array(1001).fill('a@example.com'), '', 'https://doya.example', 'secret', 'fr'), /list_too_large/)
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
