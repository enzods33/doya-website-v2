import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('le polish éditorial garde le lookbook et les transitions réversibles', () => {
  const shop = readFileSync(new URL('../src/sections/shop/Shop.jsx', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/pages/HomePage.jsx', import.meta.url), 'utf8')
  const about = readFileSync(new URL('../src/sections/about/About.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')

  assert.doesNotMatch(shop, /product-folio/)
  assert.doesNotMatch(styles, /\.product-folio\s*\{/)
  assert.match(home, /section-bridge--music-about/)
  assert.match(home, /section-bridge--gallery-live/)
  assert.match(home, /section-bridge--live-shop/)
  assert.match(home, /section-bridge--music-about[\s\S]*?<Stars color="red" className="section-bridge-stars" \/>/)
  assert.match(home, /section-bridge--live-shop[\s\S]*?<Stars color="red" className="section-bridge-stars" \/>/)
  assert.match(home, /<div className="section-bridge section-bridge--gallery-live" aria-hidden="true" \/>/)
  assert.match(about, /<div className="section-bridge section-bridge--about-gallery" aria-hidden="true" \/>/)
  assert.match(styles, /\.section-bridge--about-gallery\s*\{[\s\S]*?height:\s*clamp\(16px, 1\.75vw, 24px\)/)
  assert.match(styles, /\.section-bridge--about-gallery::before,[\s\S]*?\.section-bridge--gallery-live::after\s*\{[\s\S]*?content:\s*none;[\s\S]*?display:\s*none;/)
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.section-bridge--about-gallery,[\s\S]*?\.section-bridge--gallery-live\s*\{[\s\S]*?height:\s*13px;/)
  assert.match(styles, /grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\)/)
  assert.match(styles, /\.products > \.product\.is-featured\s*\{[\s\S]*?grid-column:\s*span 7;[\s\S]*?grid-row:\s*auto;/)
  assert.match(styles, /\.product\.is-featured \.product-image-trigger\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?aspect-ratio:\s*16 \/ 10;/)
  assert.match(styles, /\.shop-section \.product\.is-featured \.product-buy\s*\{[\s\S]*?margin-top:\s*16px;/)
  assert.match(styles, /@keyframes doya-fashion-atmosphere/)
  assert.match(styles, /@keyframes doya-lookbook-light/)
  assert.match(styles, /@keyframes doya-bridge-stars/)
  assert.match(styles, /\.section-bridge-stars\s*\{/)
  assert.match(styles, /@media \(min-width: 1101px\)[\s\S]*?\.music-section\s*\{[\s\S]*?height:\s*auto;[\s\S]*?max-height:\s*none;/)
  assert.match(styles, /\.section-bridge-stars\s*\{[\s\S]*?width:\s*clamp\(22px, 1\.8vw, 27px\)/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/)
})
