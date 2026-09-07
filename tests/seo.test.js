import test from 'node:test'
import assert from 'node:assert/strict'
import { buildJsonLd, resolveRouteSeo } from '../src/utils/seo.js'
import { translate } from '../src/i18n/index.js'
import fr from '../src/i18n/locales/fr.js'

const t = (key) => translate(fr, key)

test('SEO routes publiques et noindex privées', () => {
  assert.match(resolveRouteSeo('/', t).title, /DOYA/)
  assert.equal(resolveRouteSeo('/', t).canonicalPath, '/')
  assert.equal(resolveRouteSeo('/mentions-legales', t).canonicalPath, '/mentions-legales')
  assert.equal(resolveRouteSeo('/cgv', t).canonicalPath, '/cgv')
  assert.equal(resolveRouteSeo('/confidentialite', t).canonicalPath, '/confidentialite')
  assert.equal(resolveRouteSeo('/panier', t).canonicalPath, '/panier')
  assert.equal(resolveRouteSeo('/commande', t).canonicalPath, '/commande')
  assert.equal(resolveRouteSeo('/admin', t).canonicalPath, '/admin')
})

test('JSON-LD MusicGroup / WebSite pointe vers le domaine', () => {
  const graph = buildJsonLd('https://example.com')
  assert.equal(graph['@context'], 'https://schema.org')
  const types = graph['@graph'].map((node) => node['@type'])
  assert.ok(types.includes('MusicGroup'))
  assert.ok(types.includes('WebSite'))
  assert.ok(types.includes('WebPage'))
  const artist = graph['@graph'].find((node) => node['@type'] === 'MusicGroup')
  assert.equal(artist.name, 'DOYA')
  assert.ok(Array.isArray(artist.sameAs) && artist.sameAs.length >= 5)
  assert.match(artist.album.image, /luna-bohemia-cover\.jpg$/)
})
