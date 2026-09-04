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
import { navigation, mobileNavigation } from '../src/data/siteContent.js'
import { contacts, pressKit } from '../src/data/contacts.js'
import { isExternalUrl } from '../src/utils/links.js'
import { revealMotion } from '../src/utils/motion.js'

test('12 titres dans l’ordre des crédits officiels', () => {
  assert.equal(album.tracks.length, 12)
  assert.deepEqual(album.tracks.map((track) => track.number), Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')))
  assert.deepEqual(album.tracks.map((track) => track.title), ['Solo tú', 'Ángel de la guarda', 'Guerrières', 'Casa de los limoneros', 'Todo de mí', 'Mariposa', 'Lo vi venir', 'Ahora', 'Dónde se va', 'Mueve', 'Luna Bohemia', 'Amor y libertad'])
})

test('concerts locaux ont une forme valide (date, ville, salle, pays, billetterie)', () => {
  assert.ok(concerts.length > 0)
  assert.ok(concerts.length <= 12)
  for (const concert of concerts) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(concert.date), concert.date)
    assert.ok(concert.city.trim().length > 0)
    assert.ok(concert.venue.trim().length > 0)
    assert.ok(/^[A-Z]{2,3}$/.test(concert.country), concert.country)
    assert.ok(['link', 'soon', 'none'].includes(concert.ticketing), concert.ticketing)
    if (concert.ticketing === 'link') {
      assert.ok(isExternalUrl(concert.ticketUrl))
    } else {
      assert.ok(concert.ticketUrl === null || isExternalUrl(concert.ticketUrl))
    }
  }
  assert.ok(concerts.some((c) => c.venue === 'Audentia' && c.ticketing === 'link' && isExternalUrl(c.ticketUrl)))
})

test('aucun faux lien ou prix inventé', () => {
  for (const platform of album.platforms) {
    assert.ok(platform.url === null || isExternalUrl(platform.url))
  }
  for (const track of album.tracks) {
    for (const url of Object.values(track.links || {})) {
      assert.ok(url === null || isExternalUrl(url))
    }
  }
  for (const entry of [...products, ...socials]) {
    assert.ok(entry.url === null || isExternalUrl(entry.url))
  }
  const tracksWithLinks = album.tracks.filter((track) => Object.values(track.links || {}).some((url) => isExternalUrl(url)))
  assert.deepEqual(
    tracksWithLinks.map((track) => track.title),
    ['Todo de mí', 'Mariposa', 'Lo vi venir', 'Mueve'],
    'uniquement les titres déjà publiés ont des liens',
  )
  for (const track of tracksWithLinks) {
    assert.ok(isExternalUrl(track.links.spotify))
    assert.ok(isExternalUrl(track.links.deezer))
    assert.ok(isExternalUrl(track.links.youtube), 'clip YouTube officiel attendu')
    assert.equal(new URL(track.links.spotify).hostname, 'open.spotify.com')
    assert.equal(new URL(track.links.deezer).hostname, 'www.deezer.com')
    assert.equal(new URL(track.links.youtube).hostname, 'www.youtube.com')
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
  assert.ok(galleryImages.length > 0)
  assert.ok(galleryImages.every((image) => (
    image.src.startsWith('https://')
    && image.width > 0
    && image.height > 0
    && image.alt.length > 5
  )))
})

test('les profils officiels sont distincts et prêts pour le footer', () => {
  assert.deepEqual(socials.map((social) => social.name), ['Spotify', 'Apple Music', 'Deezer', 'YouTube', 'Instagram', 'TikTok', 'Facebook'])
  assert.deepEqual(socials.filter((social) => social.group === 'listen').map((social) => social.name), ['Spotify', 'Apple Music', 'Deezer', 'YouTube'])
  assert.deepEqual(socials.filter((social) => social.group === 'social').map((social) => social.name), ['Instagram', 'TikTok', 'Facebook'])
  assert.ok(socials.every((social) => isExternalUrl(social.url)))
  assert.equal(new Set(socials.map((social) => social.url)).size, socials.length)
  assert.deepEqual(socials.map((social) => new URL(social.url).hostname), [
    'open.spotify.com', 'music.apple.com', 'www.deezer.com', 'www.youtube.com', 'www.instagram.com', 'www.tiktok.com', 'www.facebook.com',
  ])
  assert.ok(socials.find((social) => social.name === 'Spotify').url.endsWith('/1JGqJy0whUevjrA3Tw6OMA'))
  assert.ok(socials.find((social) => social.name === 'Apple Music').url.endsWith('/1646461706'))
  assert.ok(socials.find((social) => social.name === 'Deezer').url.endsWith('/184643787'))
  assert.deepEqual(album.platforms.map((platform) => platform.id), ['spotify', 'apple', 'deezer'])
  assert.ok(album.platforms.every((platform) => isExternalUrl(platform.url)), 'liens album temporaires = profils artistes jusqu’à la sortie')
  assert.equal(album.buyHref, '#shop')
  assert.equal(album.buyLabel, 'Merch')
})

test('la navigation et le contact officiels sont en place', () => {
  assert.deepEqual(navigation.map((item) => item.labelKey), ['nav.music', 'nav.live', 'nav.shop', 'nav.about', 'nav.contact'])
  assert.equal(navigation.at(-1).href, '#contact')
  assert.deepEqual(mobileNavigation.map((item) => item.labelKey), ['nav.music', 'nav.live', 'nav.shop', 'nav.about', 'nav.contact'])
  assert.equal(mobileNavigation.find((item) => item.labelKey === 'nav.about').href, '#about')
  assert.deepEqual(contacts.map((contact) => contact.email), ['almenaprod@gmail.com', 'doyamusicofficial@gmail.com'])
  assert.deepEqual(contacts.map((contact) => contact.id), ['booking', 'press'])
  assert.ok(pressKit.href === null || pressKit.href.startsWith('/') || pressKit.href.startsWith('https://'))
})

test('les JPEG sources locaux restants correspondent au manifeste', () => {
  const manifest = JSON.parse(readFileSync(new URL('../reference/asset-manifest.json', import.meta.url), 'utf8'))
  const byFile = new Map(manifest.map((asset) => [asset.file, asset]))
  const localJpgs = [
    'src/assets/images/doya/doya-desert-02.jpg',
    'src/assets/images/doya/doya-desert-chairs-front.jpg',
    'src/assets/images/luna-bohemia/luna-bohemia-cover.jpg',
  ]
  for (const file of localJpgs) {
    const abs = fileURLToPath(new URL(`../${file}`, import.meta.url))
    assert.ok(existsSync(abs), file)
    const asset = byFile.get(file)
    if (!asset) continue
    const bytes = readFileSync(abs)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, file)
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
