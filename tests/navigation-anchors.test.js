import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('les ancres publiques restent sur les vraies sections, jamais sur les transitions', () => {
  const siteContent = readFileSync(new URL('../src/data/siteContent.js', import.meta.url), 'utf8')
  const music = readFileSync(new URL('../src/sections/music/Music.jsx', import.meta.url), 'utf8')
  const about = readFileSync(new URL('../src/sections/about/About.jsx', import.meta.url), 'utf8')
  const live = readFileSync(new URL('../src/sections/live/Live.jsx', import.meta.url), 'utf8')
  const shop = readFileSync(new URL('../src/sections/shop/Shop.jsx', import.meta.url), 'utf8')
  const footer = readFileSync(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8')
  const router = readFileSync(new URL('../src/utils/router.js', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')

  for (const hash of ['#music', '#about', '#gallery', '#live', '#shop', '#contact']) {
    assert.match(siteContent, new RegExp(`href: '${hash.replace('#', '\\#')}'`))
  }

  assert.match(music, /<section[^>]+id="music"/)
  assert.match(about, /<section[^>]+id="about"/)
  assert.match(about, /<section[^>]+id="gallery"/)
  assert.match(live, /<section[^>]+id="live"/)
  assert.match(shop, /<section[^>]+id="shop"/)
  assert.match(footer, /<footer[^>]+id="contact"/)

  assert.doesNotMatch(home, /section-bridge[^>]+id=/)
  assert.doesNotMatch(about, /section-bridge[^>]+id=/)

  assert.match(router, /getBoundingClientRect\(\)\.top \+ window\.scrollY - stickyOffset\(\)/)
  assert.match(styles, /#music,[\s\S]*?#contact\s*\{[\s\S]*?scroll-margin-top:\s*var\(--header-height\)/)
})
