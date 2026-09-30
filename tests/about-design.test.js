import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('la bio conserve sa citation éditoriale monumentale et responsive', () => {
  const about = readFileSync(new URL('../src/sections/about/About.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')
  const rtl = readFileSync(new URL('../src/styles/rtl.css', import.meta.url), 'utf8')

  assert.match(about, /<blockquote className="about-pullquote">/)
  assert.match(about, /t\('about\.pullQuote'\)/)
  assert.match(styles, /\.about-pullquote p\s*\{[\s\S]*font-size:\s*clamp\(2\.65rem, 5vw, 5\.4rem\)/)
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*\.about-pullquote p\s*\{[\s\S]*font-size:\s*clamp\(2\.25rem, 10\.6vw, 3\.15rem\)/)
  assert.match(rtl, /html\[dir='rtl'\] \.about-pullquote::before/)
})
