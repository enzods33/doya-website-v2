import test from 'node:test'
import assert from 'node:assert/strict'
import { LOCALES, detectBrowserLocale, getByPath, translate } from '../src/i18n/index.js'
import fr from '../src/i18n/locales/fr.js'
import es from '../src/i18n/locales/es.js'
import en from '../src/i18n/locales/en.js'
import pt from '../src/i18n/locales/pt.js'

const catalogs = { fr, es, en, pt }

function collectKeys(value, prefix = '') {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return [prefix].filter(Boolean)
  return Object.entries(value).flatMap(([key, nested]) => collectKeys(nested, prefix ? `${prefix}.${key}` : key))
}

test('les locales FR ES EN PT exposent les mêmes clés', () => {
  const reference = collectKeys(fr).sort()
  for (const locale of LOCALES) {
    assert.deepEqual(collectKeys(catalogs[locale]).sort(), reference, locale)
  }
})

test('la détection navigateur mappe vers une locale supportée', () => {
  assert.equal(detectBrowserLocale(['es-ES', 'fr']), 'es')
  assert.equal(detectBrowserLocale(['pt-BR']), 'pt')
  assert.equal(detectBrowserLocale(['de-DE', 'en-US']), 'en')
  assert.equal(detectBrowserLocale(['de-DE', 'it-IT']), 'fr')
})

test('translate interpolates et retombe sur le FR', () => {
  assert.equal(translate(en, 'nav.music'), 'Music')
  assert.equal(translate(es, 'cart.lineMeta', { color: 'Negro', size: 'M' }), 'Negro · talla M')
  assert.equal(translate({}, 'hero.label', {}, fr), 'Nouvel album')
  assert.equal(getByPath(fr, 'live.emptyTitle'), 'Bientôt sur scène.')
})
