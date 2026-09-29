import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LOCALES,
  detectBrowserLocale,
  getByPath,
  loadLocaleMessages,
  localeCatalog,
  normalizeLocaleCode,
  translate,
} from '../src/i18n/index.js'
import fr from '../src/i18n/locales/fr.js'
import es from '../src/i18n/locales/es.js'
import en from '../src/i18n/locales/en.js'
import pt from '../src/i18n/locales/pt.js'

function collectKeys(value, prefix = '') {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return [prefix].filter(Boolean)
  return Object.entries(value).flatMap(([key, nested]) => collectKeys(nested, prefix ? `${prefix}.${key}` : key))
}

test('les 9 locales résolues exposent les mêmes clés', async () => {
  assert.deepEqual(LOCALES, ['fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar'])
  const reference = collectKeys(fr).sort()
  for (const locale of LOCALES) {
    const messages = await loadLocaleMessages(locale)
    assert.deepEqual(collectKeys(messages).sort(), reference, locale)
  }
})

test('les locales historiques restent complètes sans fallback étendu', () => {
  const reference = collectKeys(fr).sort()
  for (const [locale, messages] of Object.entries({ es, en, pt })) {
    assert.deepEqual(collectKeys(messages).sort(), reference, locale)
  }
})

test('la détection navigateur mappe les variantes régionales vers les 9 langues', () => {
  assert.equal(detectBrowserLocale(['es-ES', 'fr']), 'es')
  assert.equal(detectBrowserLocale(['pt-BR']), 'pt')
  assert.equal(detectBrowserLocale(['de-DE', 'en-US']), 'de')
  assert.equal(detectBrowserLocale(['ja-JP']), 'ja')
  assert.equal(detectBrowserLocale(['ko-KR']), 'ko')
  assert.equal(detectBrowserLocale(['zh-CN']), 'zh')
  assert.equal(detectBrowserLocale(['zh-Hans-CN']), 'zh')
  assert.equal(detectBrowserLocale(['zh-TW']), 'zh')
  assert.equal(detectBrowserLocale(['ar-MA']), 'ar')
  assert.equal(detectBrowserLocale(['ar-SA']), 'ar')
  assert.equal(detectBrowserLocale(['it-IT']), 'fr')
  assert.equal(normalizeLocaleCode('ZH_cn'), 'zh')
  assert.equal(normalizeLocaleCode('AR_ma'), 'ar')
})

test('les métadonnées BCP47 sont correctes', () => {
  assert.equal(localeCatalog.de.intl, 'de-DE')
  assert.equal(localeCatalog.ja.intl, 'ja-JP')
  assert.equal(localeCatalog.ko.intl, 'ko-KR')
  assert.equal(localeCatalog.zh.intl, 'zh-CN')
  assert.equal(localeCatalog.ar.intl, 'ar')
  assert.equal(localeCatalog.ar.dir, 'rtl')
})

test('les nouvelles langues traduisent les parcours publics critiques', async () => {
  const de = await loadLocaleMessages('de')
  const ja = await loadLocaleMessages('ja')
  const ko = await loadLocaleMessages('ko')
  const zh = await loadLocaleMessages('zh')
  const ar = await loadLocaleMessages('ar')

  assert.equal(getByPath(de, 'cart.pay'), 'Bezahlen')
  assert.equal(getByPath(ja, 'shop.add'), 'カートに追加')
  assert.equal(getByPath(ko, 'newsletter.submit'), '구독하기')
  assert.equal(getByPath(zh, 'legal.privacy.title'), '隐私政策')
  assert.equal(getByPath(ar, 'cart.pay'), 'الدفع')
  assert.equal(getByPath(ar, 'music.albumTitle'), 'لونا بوهيميا')
  assert.equal(getByPath(ar, 'shop.product.tee-luna-mini-red'), 'الأطوار للأطفال')
  assert.equal(translate(ja, 'cart.quoteBody', { items: 'X', country: 'JP', email: 'a@b.c', message: 'M' }).includes('JP'), true)
})

test('translate interpole et retombe sur le FR', () => {
  assert.equal(translate(en, 'nav.music'), 'Music')
  assert.equal(translate(es, 'cart.lineMeta', { color: 'Negro', size: 'M' }), 'Negro · talla M')
  assert.equal(translate({}, 'hero.label', {}, fr), 'Nouvel album')
  assert.equal(getByPath(fr, 'live.emptyTitle'), 'Bientôt sur scène.')
})
