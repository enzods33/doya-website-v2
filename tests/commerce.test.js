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
  assert.ok(formatEuros(4500, 'ar'))
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

test('les noms produits connus sont localisés et les nouveaux gardent le nom catalogue en fallback', () => {
  const messages = readFileSync(new URL('../src/commerce/messages.js', import.meta.url), 'utf8')
  const labels = readFileSync(new URL('../supabase/functions/_shared/checkoutLabels.ts', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../supabase/migrations/20260928193500_rename_phases_mini_to_phases_kids.sql', import.meta.url), 'utf8')

  assert.match(messages, /const catalogName = product\.displayName \|\| product\.name/)
  assert.match(messages, /name: translatedName === nameKey \? \(catalogName \|\| product\.id\) : translatedName/)
  assert.match(labels, /return PRODUCT_BASE\[locale\]\[productId\] \|\| fallback\.trim\(\) \|\| productId/)
  assert.match(migration, /set name = 'Phases Kids'/)

  const expected = {
    fr: ['Phases Kids', 'Étoiles', 'Phases', 'Luna Bohemia — CD Digipack'],
    es: ['Fases Kids', 'Estrellas', 'Fases', 'Luna Bohemia — CD Digipack'],
    en: ['Phases Kids', 'Stars', 'Phases', 'Luna Bohemia — Digipak CD'],
    pt: ['Fases Kids', 'Estrelas', 'Fases', 'Luna Bohemia — CD Digipack'],
    de: ['Phasen Kids', 'Sterne', 'Phasen', 'Luna Bohemia — Digipak-CD'],
    ja: ['月の満ち欠け キッズ', '星', '月の満ち欠け', 'Luna Bohemia — CDデジパック'],
    ko: ['달의 위상 키즈', '별', '달의 위상', 'Luna Bohemia — CD 디지팩'],
    zh: ['月相儿童款', '星星', '月相', 'Luna Bohemia — CD 纸盒装'],
    ar: ['الأطوار للأطفال', 'نجوم', 'الأطوار', 'Luna Bohemia — CD ديجيباك'],
  }
  for (const [locale, names] of Object.entries(expected)) {
    const source = readFileSync(new URL(`../src/i18n/locales/${locale}.js`, import.meta.url), 'utf8')
    for (const name of names) assert.ok(source.includes(name), `${locale}: ${name}`)
  }

        assert.match(labels, /digipack: 'CDデジパック'/)
  assert.match(labels, /digipack: 'CD 디지팩'/)
  assert.match(labels, /digipack: 'CD 纸盒装'/)
})

test('le tote bag utilise DOYA comme nom commercial', () => {
  const labels = readFileSync(new URL('../supabase/functions/_shared/checkoutLabels.ts', import.meta.url), 'utf8')
  const fr = readFileSync(new URL('../src/i18n/locales/fr.js', import.meta.url), 'utf8')
  const en = readFileSync(new URL('../src/i18n/locales/en.js', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../supabase/migrations/20260929074200_rename_tote_eclipse_to_doya.sql', import.meta.url), 'utf8')

  assert.match(labels, /'tote-eclipse-black': 'DOYA'/)
  assert.match(fr, /'tote-eclipse-black': 'DOYA'/)
  assert.match(en, /'tote-eclipse-black': 'DOYA'/)
  assert.match(migration, /set name = 'DOYA'/)
  assert.match(migration, /tote-eclipse-black/)
})

test('le panier présente un opt-in newsletter explicite et non bloquant', () => {
  const cart = readFileSync(new URL('../src/pages/CartPage.jsx', import.meta.url), 'utf8')
  const fr = readFileSync(new URL('../src/i18n/locales/fr.js', import.meta.url), 'utf8')
  const en = readFileSync(new URL('../src/i18n/locales/en.js', import.meta.url), 'utf8')
  const es = readFileSync(new URL('../src/i18n/locales/es.js', import.meta.url), 'utf8')
  const pt = readFileSync(new URL('../src/i18n/locales/pt.js', import.meta.url), 'utf8')

  assert.match(cart, /checked=\{newsletter\}/)
  assert.match(cart, /cart\.newsletterHint/)
  assert.match(cart, /await subscribeNewsletter\(email\.trim\(\), locale, '', 'cart'\)/)
  assert.match(cart, /Ne bloque pas le paiement si Brevo échoue/)
  assert.match(fr, /Recevoir les actualités DOYA/)
  assert.match(fr, /Newsletter gratuite · désabonnement à tout moment/)
  assert.match(en, /Free newsletter · unsubscribe at any time/)
  assert.match(es, /Newsletter gratuita · cancela la suscripción en cualquier momento/)
  assert.match(pt, /Newsletter gratuita · cancelar subscrição a qualquer momento/)
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

test('Stripe, Brevo et la bio couvrent les 9 langues', () => {
  const labels = readFileSync(new URL('../supabase/functions/_shared/checkoutLabels.ts', import.meta.url), 'utf8')
  const checkout = readFileSync(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8')
  const subscribe = readFileSync(new URL('../supabase/functions/subscribe-newsletter/index.ts', import.meta.url), 'utf8')
  const confirmNewsletter = readFileSync(new URL('../supabase/functions/confirm-newsletter/index.ts', import.meta.url), 'utf8')
  const brevo = readFileSync(new URL('../supabase/functions/admin-brevo-campaign/index.ts', import.meta.url), 'utf8')
  const bioFn = readFileSync(new URL('../supabase/functions/admin-bio-photos/index.ts', import.meta.url), 'utf8')
  const bioMigration = readFileSync(new URL('../supabase/migrations/20260929143000_site_bio_ar_locale.sql', import.meta.url), 'utf8')
  const orderMigration = readFileSync(new URL('../supabase/migrations/20260929143500_orders_locale.sql', import.meta.url), 'utf8')
  const orderEmail = readFileSync(new URL('../supabase/functions/_shared/orderEmail.ts', import.meta.url), 'utf8')
  const webhook = readFileSync(new URL('../supabase/functions/stripe-webhook/index.ts', import.meta.url), 'utf8')
  const payment = readFileSync(new URL('../supabase/functions/_shared/checkoutPayment.ts', import.meta.url), 'utf8')
  const notifications = readFileSync(new URL('../supabase/functions/_shared/orderNotifications.ts', import.meta.url), 'utf8')
  const adminStats = readFileSync(new URL('../supabase/functions/admin-stats/index.ts', import.meta.url), 'utf8')
  const unsubscribe = readFileSync(new URL('../src/pages/UnsubscribePage.jsx', import.meta.url), 'utf8')
  const rtl = readFileSync(new URL('../src/styles/rtl.css', import.meta.url), 'utf8')

  assert.match(labels, /'fr' \| 'es' \| 'en' \| 'pt' \| 'de' \| 'ja' \| 'ko' \| 'zh' \| 'ar'/)
  for (const locale of ['de', 'ja', 'ko', 'zh', 'ar']) {
    assert.match(labels, new RegExp(`\\b${locale}: \\{`))
    assert.match(confirmNewsletter, new RegExp(`\\n  ${locale}: \\{`))
    assert.match(unsubscribe, new RegExp(`\\n  ${locale}: \\{`))
  }
  assert.match(labels, /locale === 'ar' \? 'auto' : locale/)
  assert.match(labels, /'cd-luna-bohemia': 'Luna Bohemia'/)
  assert.match(labels, /الأطوار للأطفال/)
  assert.match(checkout, /shipping_zone_id: zone\.id/)
  assert.match(checkout, /shipping_country: country/)
  assert.match(checkout, /loadShippingZones\(admin, false\)/)
  assert.match(checkout, /terms_accepted_at/)
  assert.match(checkout, /TERMS_VERSION = '2026-10-02'/)
  assert.match(brevo, /'de', 'ja', 'ko', 'zh', 'ar'/)
  assert.match(brevo, /de: 0, ja: 0, ko: 0, zh: 0, ar: 0/)
  assert.match(bioFn, /'de', 'ja', 'ko', 'zh', 'ar'/)
  assert.match(bioMigration, /locale in \('fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar'\)/)
  assert.match(bioMigration, /on conflict \(locale\) do nothing/)
  assert.match(orderMigration, /add column if not exists locale text not null default 'fr'/)
  assert.match(orderMigration, /orders_locale_check/)
  assert.match(orderEmail, /ar: \{/)
  assert.match(orderEmail, /dir="\$\{dir\}"/)
  assert.match(orderEmail, /تم شحن الطلب/)
  assert.match(webhook, /finalizePaidCheckout/)
  assert.match(payment, /total_amount_mismatch/)
  assert.match(notifications, /email, locale, status/)
  assert.match(adminStats, /email, locale, status/)
  assert.match(rtl, /html\[dir='rtl'\]/)
})

test('le back-office bio propose DeepL sans automatiser les traductions', () => {
  const bioUi = readFileSync(new URL('../src/pages/admin/AdminBio.jsx', import.meta.url), 'utf8')
  assert.match(bioUi, /https:\/\/www\.deepl\.com\/fr\/translate/)
  assert.match(bioUi, /target="_blank"/)
  assert.match(bioUi, /rel="noopener noreferrer"/)
  assert.doesNotMatch(bioUi, /translate_bio|AZURE_TRANSLATOR/)
  const frMessages = readFileSync(new URL('../src/i18n/locales/fr.js', import.meta.url), 'utf8')
  assert.match(frMessages, /bioTranslatorHelp:/)
  assert.match(frMessages, /bioTranslatorLink:/)
  for (const locale of ['es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar']) {
    const messages = readFileSync(new URL(`../src/i18n/locales/${locale}.js`, import.meta.url), 'utf8')
    assert.doesNotMatch(messages, /bioTranslatorHelp:/)
    assert.doesNotMatch(messages, /bioTranslatorLink:/)
  }
})

test('aucune clé secrète n’est embarquée dans le client', () => {
  const client = readFileSync(new URL('../src/commerce/checkout.js', import.meta.url), 'utf8')
  const getOrder = readFileSync(new URL('../supabase/functions/get-order/index.ts', import.meta.url), 'utf8')
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


test('le checkout verrouille montants, CGV, emails et maintenance Stripe', () => {
  const migration = readFileSync(new URL('../supabase/migrations/20261002073000_commerce_backend_hardening.sql', import.meta.url), 'utf8')
  const cron = readFileSync(new URL('../supabase/migrations/20261002073500_commerce_maintenance_cron.sql', import.meta.url), 'utf8')
  const shippingIndex = readFileSync(new URL('../supabase/migrations/20261002090500_orders_shipping_zone_index.sql', import.meta.url), 'utf8')
  const shippingCountryMigration = readFileSync(new URL('../supabase/migrations/20261002091000_orders_shipping_country.sql', import.meta.url), 'utf8')
  const shippingOutboxMigration = readFileSync(new URL('../supabase/migrations/20261002091500_order_email_outbox_shipping.sql', import.meta.url), 'utf8')
  const checkout = readFileSync(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8')
  const payment = readFileSync(new URL('../supabase/functions/_shared/checkoutPayment.ts', import.meta.url), 'utf8')
  const notifications = readFileSync(new URL('../supabase/functions/_shared/orderNotifications.ts', import.meta.url), 'utf8')
  const maintenance = readFileSync(new URL('../supabase/functions/commerce-maintenance/index.ts', import.meta.url), 'utf8')
  const getOrder = readFileSync(new URL('../supabase/functions/get-order/index.ts', import.meta.url), 'utf8')
  const adminStats = readFileSync(new URL('../supabase/functions/admin-stats/index.ts', import.meta.url), 'utf8')
  const client = readFileSync(new URL('../src/commerce/checkout.js', import.meta.url), 'utf8')
  const cart = readFileSync(new URL('../src/pages/CartPage.jsx', import.meta.url), 'utf8')

  assert.match(migration, /shipping_zone_id text/)
  assert.match(migration, /terms_accepted_at timestamptz/)
  assert.match(migration, /terms_version text/)
  assert.match(migration, /create table if not exists public\.order_email_outbox/)
  assert.match(migration, /claim_due_order_emails/)
  assert.match(migration, /shipping_amount_mismatch/)
  assert.match(migration, /total_amount_mismatch/)
  assert.match(migration, /order_items_order_id_idx/)
  assert.match(migration, /stock_reservations_variant_id_idx/)
  assert.match(checkout, /body\.termsAccepted !== true/)
  assert.match(checkout, /shipping_zone_id: zone\.id/)
  assert.match(checkout, /shipping_country: country/)
  assert.match(checkout, /loadShippingZones\(admin, false\)/)
  assert.match(client, /termsAccepted: termsAccepted === true/)
  assert.match(cart, /termsAccepted: acceptCgv/)
  assert.match(payment, /order\.stripe_checkout_session_id !== session\.id/)
  assert.match(payment, /checkout_session_mismatch/)
  assert.match(payment, /shippingCents !== order\.shipping_cents/)
  assert.match(payment, /totalCents === null \|\| totalCents !== order\.total_cents/)
  assert.match(payment, /currency_mismatch/)
  assert.match(payment, /shipping_country_mismatch/)
  assert.match(payment, /order\.shipping_country/)
  assert.match(payment, /if \(!queued\) throw new Error\('order_email_queue_failed'\)/)
  assert.match(notifications, /claim_due_order_emails/)
  assert.match(notifications, /queueShippedOrderEmail/)
  assert.match(notifications, /shipped_notification/)
  assert.match(notifications, /requeuePaidOrderEmail/)
  assert.match(orderEmail, /messageVersions/)
  assert.match(orderEmail, /brevo_paid_order_batch_failed/)
  assert.match(orderEmail, /responsePayload\.code === 'duplicate_parameter'/)
  assert.match(notifications, /sendPaidOrderEmails\(loaded\.payload, row\.id\)/)
  assert.match(maintenance, /checkout\.sessions\.retrieve/)
  assert.match(maintenance, /processDueOrderEmails/)
  assert.match(getOrder, /finalizePaidCheckout/)
  assert.match(getOrder, /stripePaid && order\.status === 'pending'/)
  assert.match(adminStats, /action === 'resend_confirmation'/)
  assert.match(adminStats, /queueShippedOrderEmail/)
  assert.match(cron, /doya-commerce-maintenance/)
  assert.match(cron, /x-doya-maintenance-token/)
  assert.match(shippingIndex, /orders_shipping_zone_id_idx/)
  assert.match(shippingCountryMigration, /shipping_country text/)
  assert.match(shippingOutboxMigration, /order_email_outbox_kind_check/)
  assert.match(shippingOutboxMigration, /shipped_notification/)
})

test('le devis livraison revalide le panier côté serveur', () => {
  const quote = readFileSync(new URL('../supabase/functions/request-shipping-quote/index.ts', import.meta.url), 'utf8')
  assert.match(quote, /totalQuantity > CART_LIMITS\.maxTotalQuantity/)
  assert.match(quote, /product\.on_sale !== true/)
  assert.match(quote, /product_unavailable/)
})

test('le passage expédié ne peut envoyer qu’un seul e-mail', () => {
  const adminStats = readFileSync(new URL('../supabase/functions/admin-stats/index.ts', import.meta.url), 'utf8')
  const orderEmail = readFileSync(new URL('../supabase/functions/_shared/orderEmail.ts', import.meta.url), 'utf8')
  assert.match(adminStats, /select\('id'\)/)
  assert.match(adminStats, /if \(!shippedRow\)/)
  assert.match(adminStats, /already_shipped/)
  assert.match(adminStats, /trackingNumber,[\s\S]*?\}, orderId\)/)
  assert.match(orderEmail, /idempotencyKey/)
})

test('la newsletter protège la confidentialité et prépare le double opt-in', () => {
  const subscribe = readFileSync(new URL('../supabase/functions/subscribe-newsletter/index.ts', import.meta.url), 'utf8')
  const confirm = readFileSync(new URL('../supabase/functions/confirm-newsletter/index.ts', import.meta.url), 'utf8')
  const client = readFileSync(new URL('../src/commerce/newsletter.js', import.meta.url), 'utf8')
  const signup = readFileSync(new URL('../src/components/NewsletterSignup.jsx', import.meta.url), 'utf8')
  const campaign = readFileSync(new URL('../supabase/functions/admin-brevo-campaign/index.ts', import.meta.url), 'utf8')
  const unsubscribe = readFileSync(new URL('../supabase/functions/unsubscribe-newsletter/index.ts', import.meta.url), 'utf8')
  const migration = readFileSync(new URL('../supabase/migrations/20261002090000_newsletter_double_opt_in.sql', import.meta.url), 'utf8')
  const campaignMigration = readFileSync(new URL('../supabase/migrations/20261002092000_newsletter_messages_idempotency.sql', import.meta.url), 'utf8')
  const unsubscribeShared = readFileSync(new URL('../supabase/functions/_shared/newsletterUnsubscribe.ts', import.meta.url), 'utf8')
  const delivery = readFileSync(new URL('../supabase/functions/_shared/newsletterDelivery.ts', import.meta.url), 'utf8')

  assert.match(subscribe, /contacts\\/doubleOptinConfirmation/)
  assert.match(subscribe, /BREVO_DOI_TEMPLATE_ID/)
  assert.match(subscribe, /CONSENT_VERSION = '2026-10-02-v1'/)
  assert.match(subscribe, /CONFIRM_TTL_MS = 30 \* 24 \* 60 \* 60 \* 1000/)
  assert.match(subscribe, /hmacSha256Hex/)
  assert.doesNotMatch(subscribe, /already:/)
  assert.match(client, /source: String\\(source/)
  assert.match(signup, /isMenu \\? 'menu' : 'footer'/)
  assert.doesNotMatch(signup, /result\\.already/)
  assert.match(confirm, /welcome_sent_at/)
  assert.match(confirm, /pending_email: null/)
  assert.match(confirm, /headers: \{ idempotencyKey: row\.id \}/)
  assert.match(confirm, /payload\.code !== 'duplicate_parameter'/)
  assert.doesNotMatch(confirm, /\/desabonnement|unsubscribe-newsletter/i)
  assert.match(migration, /create table if not exists public\\.newsletter_optins/)
  assert.match(migration, /consent_version text not null/)
  assert.match(migration, /source text not null/)
  assert.match(migration, /email_hash text not null unique/)
  assert.doesNotMatch(campaign, /BREVO_UNSUBSCRIBE_SECRET'\\) \\|\\| apiKey/)
  assert.doesNotMatch(unsubscribe, /BREVO_UNSUBSCRIBE_SECRET'\\) \\|\\| apiKey/)
})

test('le rate-limit ne conserve pas les IP ou e-mails en clair', () => {
  const rate = readFileSync(new URL('../supabase/functions/_shared/rateLimit.ts', import.meta.url), 'utf8')
  const checkout = readFileSync(new URL('../supabase/functions/create-checkout-session/index.ts', import.meta.url), 'utf8')
  const subscribe = readFileSync(new URL('../supabase/functions/subscribe-newsletter/index.ts', import.meta.url), 'utf8')
  const maintenance = readFileSync(new URL('../supabase/functions/commerce-maintenance/index.ts', import.meta.url), 'utf8')
  assert.match(rate, /privateRateKey/)
  assert.match(rate, /HMAC/)
  assert.match(checkout, /privateRateKey\('checkout:email', email\)/)
  assert.match(subscribe, /privateRateKey\('newsletter:email', email\)/)
  assert.doesNotMatch(checkout, /`checkout:email:\$\{email\}`/)
  assert.doesNotMatch(subscribe, /`newsletter:email:\$\{email\}`/)
  assert.match(maintenance, /rate_limit_cleanup_failed/)
  assert.match(maintenance, /48 \* 60 \* 60 \* 1000/)
})

test('les routes à jeton restent hors index et nettoient le token confirmé', () => {
  const seo = readFileSync(new URL('../src/utils/seo.js', import.meta.url), 'utf8')
  const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')
  const confirmation = readFileSync(new URL('../src/pages/NewsletterConfirmationPage.jsx', import.meta.url), 'utf8')
  assert.match(seo, /path === '\/newsletter-confirmation'/)
  assert.doesNotMatch(seo, /INDEXABLE_PATHS[\s\S]*newsletter-confirmation/)
  assert.match(vite, /Disallow: \/newsletter-confirmation/)
  assert.match(confirmation, /window\.history\.replaceState/)
})

test('le catalogue résiste aux erreurs réseau transitoires', () => {
  const catalog = readFileSync(new URL('../src/commerce/catalog.js', import.meta.url), 'utf8')
  const provider = readFileSync(new URL('../src/commerce/CatalogProvider.jsx', import.meta.url), 'utf8')

  assert.match(catalog, /CATALOG_RETRY_DELAYS = \[0, 450, 1200\]/)
  assert.match(catalog, /for \(const delay of CATALOG_RETRY_DELAYS\)/)
  assert.match(catalog, /source: 'remote'/)
  assert.match(catalog, /source: 'local'/)
  assert.match(provider, /RECOVERY_DELAYS = \[2000, 5000, 15000, 30000\]/)
  assert.match(provider, /next\.source !== 'remote' && current\.source === 'remote'/)
  assert.match(provider, /window\.addEventListener\('online', onOnline\)/)
})

test('les icônes sociales du footer ont un rendu mobile stable', () => {
  const platform = readFileSync(new URL('../src/components/PlatformIcon.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')

  assert.match(platform, /loading="eager"/)
  assert.match(platform, /fetchPriority="high"/)
  assert.match(styles, /\.site-footer \.socials \.platform-icon\s*\{[\s\S]*?display:\s*block;[\s\S]*?visibility:\s*visible;/)
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.site-footer \.socials \.platform-icon\s*\{[\s\S]*?animation:\s*none;[\s\S]*?will-change:\s*auto;/)
  assert.doesNotMatch(styles, /footer-social-pulse/)
  assert.match(styles, /@keyframes footer-social-reveal/)
  assert.match(styles, /transform:\s*scale\(1\.05\)/)
  assert.match(styles, /animation-delay:\s*calc\(var\(--social-i, 0\) \* 55ms\)/)
})

test('la ligne produit mobile réserve une colonne dédiée au prix', () => {
  const shop = readFileSync(new URL('../src/sections/shop/Shop.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')
  assert.match(shop, /className="product-detail-copy"/)
  assert.match(shop, /className="product-detail-price"/)
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(62px, max-content\)/)
  assert.match(styles, /\.product\.is-featured \.product-detail-copy\s*\{[\s\S]*max-width:\s*31ch/)
  assert.match(styles, /\.product-detail-price\s*\{[\s\S]*white-space:\s*nowrap/)
})
