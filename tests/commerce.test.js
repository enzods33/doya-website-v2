import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { products } from '../src/data/products.js'
import { CART_LIMITS, formatEuros, isValidEmail, mergeCartLine, normalizePromoCode, validateCartItems } from '../src/commerce/cartRules.js'

test('le catalogue local n’invente ni prix ni lien boutique', () => {
  assert.ok(products.every((product) => product.price === null && product.url === null))
})

test('les limites du panier restent alignées avec les fonctions', () => {
  const deno = readFileSync(new URL('../supabase/functions/_shared/limits.ts', import.meta.url), 'utf8')
  assert.match(deno, new RegExp(`maxLineQuantity: ${CART_LIMITS.maxLineQuantity}`))
  assert.match(deno, new RegExp(`maxLines: ${CART_LIMITS.maxLines}`))
  assert.match(deno, new RegExp(`maxTotalQuantity: ${CART_LIMITS.maxTotalQuantity}`))
  for (const size of CART_LIMITS.sizes) assert.match(deno, new RegExp(`'${size}'`))
  assert.match(deno, /http:\/\/localhost:5174/)
  assert.match(deno, /http:\/\/localhost:5173/)
})

test('validation du panier et fusion des lignes', () => {
  assert.equal(validateCartItems([]).ok, false)
  assert.equal(validateCartItems([{ productId: 'test', size: 'M', quantity: 1 }]).ok, true)
  assert.equal(validateCartItems([{ productId: 'unknown', size: 'M', quantity: 1 }]).ok, false)
  assert.equal(validateCartItems([{ productId: 'luna-a', size: 'M', quantity: 6 }]).ok, false)
  const merged = mergeCartLine([{ productId: 'luna-a', size: 'M', quantity: 2 }], 'luna-a', 'M', 1)
  assert.equal(merged.ok, true)
  assert.equal(merged.items[0].quantity, 3)
  const overflow = mergeCartLine([{ productId: 'luna-a', size: 'M', quantity: 5 }], 'luna-a', 'M', 1)
  assert.equal(overflow.ok, false)
})

test('normalisation des codes et format monétaire', () => {
  assert.equal(normalizePromoCode('  luna 26 '), 'LUNA26')
  assert.equal(isValidEmail('doya@example.com'), true)
  assert.equal(isValidEmail('pas-un-email'), false)
  assert.match(formatEuros(4500), /45,00/)
  assert.match(formatEuros(4500), /€/)
  assert.equal(formatEuros(-1), null)
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
  const checkoutFn = readFileSync(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8')
  assert.match(checkoutFn, /checkoutReturnOrigin/)
  assert.match(checkoutFn, /test: 'Article test'/)
  const clients = readFileSync(new URL('../supabase/functions/_shared/clients.ts', import.meta.url), 'utf8')
  assert.match(clients, /Authorization: `Bearer \$\{key\}`/)
})
