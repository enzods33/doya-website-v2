import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('le footer magazine garde les phases lunaires et supprime le bouton cercle', () => {
  const footer = readFileSync(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')

  assert.match(footer, /luna-phases\.webp/)
  assert.match(footer, /className="footer-lunar-phases"/)
  assert.match(footer, /<Lockup className="footer-wordmark"/)
  assert.match(footer, /className="footer-back-top-link"/)
  assert.doesNotMatch(footer, /function FooterOrbit/)
  assert.doesNotMatch(footer, /className="footer-orbit"/)
  assert.doesNotMatch(footer, /<Stars\b/)
  assert.match(footer, /<footer id="contact"/)

  assert.match(styles, /@keyframes footer-luna-spin/)
  assert.match(styles, /\.footer-lunar-phases[\s\S]*animation:\s*footer-luna-spin 120s linear infinite/)
  assert.doesNotMatch(styles, /@keyframes footer-orbit-spin/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.footer-lunar-phases[\s\S]*?animation:\s*none/)
})
