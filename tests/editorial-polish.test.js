import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('le polish éditorial garde le lookbook et les transitions réversibles', () => {
  const shop = readFileSync(new URL('../src/sections/shop/Shop.jsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8')
  const about = readFileSync(new URL('../src/sections/about/About.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')

  assert.match(shop, /className="product-folio"/)
  assert.match(home, /section-bridge--music-about/)
  assert.match(home, /section-bridge--gallery-live/)
  assert.match(home, /section-bridge--live-shop/)
  assert.match(home, /<Stars color="red" className="section-bridge-stars" \/>/)
  assert.match(about, /section-bridge--about-gallery/)
  assert.match(about, /<Stars color="red" className="section-bridge-stars" \/>/)
  assert.match(styles, /grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\)/)
  assert.match(styles, /@keyframes doya-fashion-atmosphere/)
  assert.match(styles, /@keyframes doya-lookbook-light/)
  assert.match(styles, /@keyframes doya-bridge-stars/)
  assert.match(styles, /\.section-bridge-stars\s*\{/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})
