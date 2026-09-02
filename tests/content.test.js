import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { album } from '../src/data/album.js'
import { concerts } from '../src/data/live.js'
import { products } from '../src/data/products.js'
import { socials } from '../src/data/socials.js'
import { media, galleryImages } from '../src/data/media.js'
import { isExternalUrl } from '../src/utils/links.js'
import { revealMotion } from '../src/utils/motion.js'

test('12 titres dans l’ordre des crédits officiels', () => {
  assert.equal(album.tracks.length, 12)
  assert.deepEqual(album.tracks.map((track) => track.number), Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')))
  assert.deepEqual(album.tracks.map((track) => track.title), ['Solo tú', 'Ángel de la guarda', 'Guerrières', 'Casa de los limoneros', 'Todo de mí', 'Mariposa', 'Lo vi venir', 'Ahora', 'Dónde se va', 'Mueve', 'Luna Bohemia', 'Amor y libertad'])
})

test('aucun faux lien, prix ou concert', () => {
  assert.equal(concerts.length, 0)
  for (const entry of [...album.tracks, ...album.platforms, ...products, ...socials]) {
    assert.ok(entry.url === null || isExternalUrl(entry.url))
  }
  assert.ok(products.every((product) => product.price === null))
  assert.equal(isExternalUrl('#'), false)
  assert.equal(isExternalUrl('javascript:alert(1)'), false)
  assert.equal(isExternalUrl('http://insecure.invalid'), false)
})

test('les médias déclarés existent et ont des dimensions explicites', () => {
  for (const image of Object.values(media)) {
    assert.ok(existsSync(fileURLToPath(image.src)), image.src)
    assert.ok(image.width > 0 && image.height > 0 && image.alt.length > 10)
  }
  for (const product of products) {
    assert.ok(existsSync(fileURLToPath(product.front)))
    assert.ok(existsSync(fileURLToPath(product.back)))
  }
  assert.equal(new Set(galleryImages.map((image) => image.src)).size, galleryImages.length)
})

test('les JPEG sources correspondent aux flux natifs du PDF', () => {
  const manifest = JSON.parse(readFileSync(new URL('../reference/asset-manifest.json', import.meta.url), 'utf8'))
  const photographs = manifest.filter((asset) => asset.file.endsWith('.jpg'))
  assert.equal(photographs.length, 46)
  assert.ok(photographs.every((asset) => asset.nativeJpegVerified && asset.pages.length > 0))
  for (const asset of photographs) {
    const bytes = readFileSync(new URL(`../${asset.file}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.file)
  }
})

test('les lettres du Hero conservent les tracés du SVG officiel', () => {
  const wordmark = readFileSync(new URL('../src/assets/logos/doya-wordmark-white.svg', import.meta.url), 'utf8')
  for (const letter of ['d', 'o', 'y', 'a']) {
    const glyph = readFileSync(new URL(`../src/assets/logos/glyphs/doya-${letter}-white.svg`, import.meta.url), 'utf8')
    const path = glyph.match(/ d="([^"]+)"/)[1]
    assert.ok(wordmark.includes(path))
  }
})

test('les révélations respectent la réduction des mouvements', () => {
  const reduced = revealMotion(true, { delay: 1, distance: 80 })
  assert.equal(reduced.initial, false)
  assert.equal(reduced.transition.duration, 0)
  assert.equal(reduced.transition.delay, 0)
  const normal = revealMotion(false)
  assert.equal(normal.viewport.once, true)
  assert.equal(normal.initial.y, 22)
  assert.equal(normal.whileInView.y, 0)
  assert.ok(normal.transition.duration < 1)
})
