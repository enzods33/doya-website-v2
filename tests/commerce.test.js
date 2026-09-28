import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { products } from '../src/data/products.js'
import {
  AUTO_PROMOS,
  AUTO_PROMO_TEMPLATES,
  CART_LIMITS,
  FLAT_SHIPPING_LIMITS,
  bestAutoPromo,
  formatEuros,
  isValidEmail,
  mergeCartLine,
  normalizePromoCode,
  validateCartItems,
} from '../src/commerce/cartRules.js'
import { SHIPPING_ZONES, zoneForCountry } from '../src/commerce/shippingZones.js'
import { DEFAULT_ASSETS_BASE_URL } from '../src/config/publicUrls.js'
import { assetUrl, assetsBaseUrl } from '../src/utils/assets.js'

test('le catalogue local n’invente ni prix ni lien boutique', () => {
  assert.ok(products.every((product) => product.price === null && product.url === null))
})

test('les IDs panier suivent le catalogue produits', () => {
  assert.deepEqual(CART_LIMITS.productIds, products.map((product) => product.id))
})

test('les limites du panier restent alignées avec les fonctions', () => {
  const deno = readFileSync(new URL('../supabase/functions/_shared/limits.ts', import.meta.url), 'utf8')
  assert.match(deno, new RegExp(`maxLineQuantity: ${CART_LIMITS.maxLineQuantity}`))
  assert.match(deno, new RegExp(`maxLines: ${CART_LIMITS.maxLines}`))
  assert.match(deno, new RegExp(`maxTotalQuantity: ${CART_LIMITS.maxTotalQuantity}`))
  assert.match(deno, new RegExp(`maxTees: ${FLAT_SHIPPING_LIMITS.maxTees}`))
  assert.match(deno, new RegExp(`maxCds: ${FLAT_SHIPPING_LIMITS.maxCds}`))
  assert.match(deno, new RegExp(`maxVariantKeyLength: ${CART_LIMITS.maxVariantKeyLength}`))
  assert.match(deno, /http:\/\/localhost:5174/)
  assert.match(deno, /http:\/\/localhost:5173/)
})

test('les zones de port front restent alignées avec Deno', () => {
  const deno = readFileSync(new URL('../supabase/functions/_shared/shipping.ts', import.meta.url), 'utf8')
  for (const zone of SHIPPING_ZONES) {
    assert.match(deno, new RegExp(`id: '${zone.id}'`))
    assert.match(deno, new RegExp(`amountCents: ${zone.amountCents}`))
    for (const country of zone.countries) assert.match(deno, new RegExp(`'${country}'`))
  }
  assert.equal(zoneForCountry('FR')?.id, 'fr')
  assert.equal(zoneForCountry('re')?.id, 'dom')
  assert.equal(zoneForCountry('XX'), null)
})

test('auto-promos désactivées par défaut et règles conservées', () => {
  assert.deepEqual(AUTO_PROMOS, [])
  assert.equal(bestAutoPromo(2, 1), null)
  assert.equal(AUTO_PROMO_TEMPLATES.find((p) => p.id === '2tees')?.amountOffCents, 800)
  assert.equal(AUTO_PROMO_TEMPLATES.find((p) => p.id === 'cdtee')?.amountOffCents, 500)
  assert.equal(bestAutoPromo(1, 0, AUTO_PROMO_TEMPLATES), null)
  assert.equal(bestAutoPromo(2, 0, AUTO_PROMO_TEMPLATES)?.id, '2tees')
  assert.equal(bestAutoPromo(1, 1, AUTO_PROMO_TEMPLATES)?.id, 'cdtee')
  assert.equal(bestAutoPromo(2, 1, AUTO_PROMO_TEMPLATES)?.id, '2tees')
})

test('URLs assets CDN stables', () => {
  assert.equal(assetsBaseUrl, DEFAULT_ASSETS_BASE_URL)
  assert.equal(assetUrl('site/hero.jpg'), `${DEFAULT_ASSETS_BASE_URL}/site/hero.jpg`)
  assert.equal(assetUrl('pressbook/press book Fr A.pdf'), `${DEFAULT_ASSETS_BASE_URL}/pressbook/press%20book%20Fr%20A.pdf`)
})

test('validation du panier et fusion des lignes', () => {
  assert.equal(validateCartItems([]).ok, false)
  assert.equal(validateCartItems([{ productId: 'doya-black', size: 'M', quantity: 1 }]).ok, true)
  assert.equal(validateCartItems([{ productId: '!!!', size: 'M', quantity: 1 }]).ok, false)
  assert.equal(validateCartItems([{ productId: 'doya-black', size: 'M', quantity: 6 }]).ok, true)
  assert.equal(validateCartItems([{ productId: 'doya-black', size: 'M', quantity: 7 }]).ok, false)
  assert.equal(validateCartItems([{ productId: 'doya-black', size: 'Noir / M', quantity: 1 }]).ok, true)
  assert.equal(validateCartItems([{ productId: 'doya-black', size: '', quantity: 1 }]).ok, false)
  assert.equal(validateCartItems([{ productId: 'doya-black', size: 'x'.repeat(CART_LIMITS.maxVariantKeyLength + 1), quantity: 1 }]).ok, false)
  const merged = mergeCartLine([{ productId: 'doya-black', size: 'M', quantity: 2 }], 'doya-black', 'M', 1)
  assert.equal(merged.ok, true)
  assert.equal(merged.items[0].quantity, 3)
  const overflow = mergeCartLine([{ productId: 'doya-black', size: 'M', quantity: 6 }], 'doya-black', 'M', 1)
  assert.equal(overflow.ok, false)
  for (const size of ['3/4', '5/6', '7/8', '9/11', '12/13']) {
    assert.equal(validateCartItems([{ productId: 'tee-luna-mini-red', size, quantity: 1 }]).ok, true)
  }
  assert.equal(validateCartItems([{ productId: 'cap-luna-black', size: 'U', quantity: 1 }]).ok, true)
  assert.equal(validateCartItems([{ productId: 'tote-eclipse-black', size: 'U', quantity: 1 }]).ok, true)
})

test('normalisation des codes et format monétaire', () => {
  assert.equal(normalizePromoCode('  luna 26 '), 'LUNA26')
  assert.equal(isValidEmail('doya@example.com'), true)
  assert.equal(isValidEmail('pas-un-email'), false)
  assert.match(formatEuros(4500), /45,00/)
  assert.match(formatEuros(4500), /€/)
  assert.equal(formatEuros(-1), null)
})

test('la vue produit reprend automatiquement 5 s après un choix manuel avec un fondu doux', () => {
  const shop = readFileSync(new URL('../src/sections/shop/Shop.jsx', import.meta.url), 'utf8')
  const transition = readFileSync(new URL('../src/components/TransitionImage.jsx', import.meta.url), 'utf8')
  assert.match(shop, /MANUAL_VIEW_RESUME_MS = 5000/)
  assert.match(shop, /manualTimers\.current\[product\.id\] = window\.setTimeout/)
  assert.match(shop, /manualHoverBypass\.current\[product\.id\] = true/)
  assert.match(shop, /manualTimers\.current\[product\.id\] \|\| manualHoverBypass\.current\[product\.id\]/)
  assert.match(shop, /const resumedView = next === 'front' \? 'back' : 'front'/)
  assert.match(transition, /duration: 0\.72/)
  assert.match(transition, /scale: 0\.985/)
})

test('le nom catalogue/back-office reste prioritaire sur les anciens libellés codés', () => {
  const messages = readFileSync(new URL('../src/commerce/messages.js', import.meta.url), 'utf8')
  const labels = readFileSync(new URL('../supabase/functions/_shared/checkoutLabels.ts', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../supabase/migrations/20260928152000_rename_luna_mini_to_phases_mini.sql', import.meta.url), 'utf8')
  assert.match(messages, /const catalogName = product\.displayName \|\| product\.name/)
  assert.match(messages, /name: catalogName \|\|/)
  assert.match(labels, /const base = fallback\.trim\(\) \|\| PRODUCT_BASE/)
  assert.match(migration, /set name = 'Phases Mini'/)
  assert.match(migration, /tee-luna-mini-red/)
})

test('les anciens chunks sont récupérés sans boucle de rechargement', () => {
  const recovery = readFileSync(new URL('../src/utils/chunkRecovery.js', import.meta.url), 'utf8')
  const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8')
  const boundary = readFileSync(new URL('../src/components/ErrorBoundary.jsx', import.meta.url), 'utf8')
  const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../supabase/migrations/20260928190000_allow_app_error_event.sql', import.meta.url), 'utf8')

  assert.match(recovery, /vite:preloadError/)
  assert.match(recovery, /doya-stale-chunk-reload/)
  assert.match(recovery, /RELOAD_WINDOW_MS = 30_000/)
  assert.match(main, /registerChunkRecovery\(\)/)
  assert.match(boundary, /recoverFromStaleChunk\(error\)/)
  assert.doesNotMatch(deploy, /--delete/)
  assert.match(migration, /'app_error'/)
  assert.match(migration, /'boundary'/)
})

test('le monitoring verrouille le contrat cache et 404 des assets', () => {
  const monitor = readFileSync(new URL('../monitoring/scripts/api-readonly.mjs', import.meta.url), 'utf8')
  assert.match(monitor, /site:html-cache/)
  assert.match(monitor, /site:hashed-asset/)
  assert.match(monitor, /site:missing-asset/)
  assert.match(monitor, /max-age=31536000/)
  assert.match(monitor, /immutable/)
  assert.match(monitor, /no-store/)
  assert.match(monitor, /missingResponse\.status === 404/)
  assert.match(monitor, /!missingType\.includes\('text\/html'\)/)
})

test('aucune clé secrète n’est embarquée dans le client', () => {
  const client = readFileSync(new URL('../src/commerce/checkout.js', import.meta.url), 'utf8')
    + readFileSync(new URL('../src/commerce/config.js', import.meta.url), 'utf8')
    + readFileSync(new URL('../src/commerce/supabase.js', import.meta.url), 'utf8')
  assert.doesNotMatch(client, /sk_live|sk_test|service_role|whsec_/)
  const init = readFileSync(new URL('../supabase/migrations/20260903120000_init_commerce.sql', import.meta.url), 'utf8')
  const lock = readFileSync(new URL('../supabase/migrations/20260903133000_lock_catalog_views.sql', import.meta.url), 'utf8')
  assert.match(init, /enable row level security/)
  assert.match(init, /create_pending_order/)
  assert.match(lock, /revoke all on table public.catalog_products/)
  assert.match(lock, /grant select on table public.catalog_products/)
  const pendingFix = readFileSync(new URL('../supabase/migrations/20260903141000_fix_pending_order_ambiguity.sql', import.meta.url), 'utf8')
  assert.match(pendingFix, /v_product_id/)
  assert.match(pendingFix, /create or replace function public.create_pending_order/)
  const orderNumbers = readFileSync(new URL('../supabase/migrations/20260907192030_order_numbers.sql', import.meta.url), 'utf8')
  assert.match(orderNumbers, /order_number/)
  assert.match(orderNumbers, /orderNumber/)
  assert.match(orderNumbers, /DOYA-/)
  const checkoutFn = readFileSync(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8')
  assert.match(checkoutFn, /checkoutReturnOrigin/)
  assert.match(checkoutFn, /orderNumber/)
  const labels = readFileSync(new URL('../supabase/functions/_shared/checkoutLabels.ts', import.meta.url), 'utf8')
  for (const product of products) {
    assert.match(labels, new RegExp(`'${product.id}':`))
  }
  assert.match(checkoutFn, /shippingCountry/)
  assert.match(checkoutFn, /shippingZoneByCountry/)
  assert.match(checkoutFn, /stripeShippingOption/)
  assert.match(checkoutFn, /normalizeCheckoutLocale/)
  assert.match(checkoutFn, /stripeProductName/)
  assert.match(checkoutFn, /locale: stripeCheckoutLocale/)
  assert.match(labels, /Estrellas/)
  assert.match(labels, /Stars/)
  assert.match(labels, /Estrelas/)
  assert.match(labels, /Mainland France/)
  const checkoutClient = readFileSync(new URL('../src/commerce/checkout.js', import.meta.url), 'utf8')
  assert.match(checkoutClient, /locale/)
  const shipping = readFileSync(new URL('../supabase/functions/_shared/shipping.ts', import.meta.url), 'utf8')
  assert.match(shipping, /amountCents: 600/)
  assert.match(shipping, /amountCents: 800/)
  assert.match(shipping, /amountCents: 1290/)
  assert.match(shipping, /'RE'/)
  assert.match(shipping, /shippingZoneByCountry/)
  const clients = readFileSync(new URL('../supabase/functions/_shared/clients.ts', import.meta.url), 'utf8')
  assert.match(clients, /Authorization: `Bearer \$\{key\}`/)
  assert.doesNotMatch(clients, /SHIPPING_CENTS/)
})
