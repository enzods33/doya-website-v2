import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('le footer editorial garde un seul cercle anime sans etoiles decoratives ajoutees', () => {
  const footer = readFileSync(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/styles/sections.css', import.meta.url), 'utf8')

  assert.match(footer, /function FooterOrbit/)
  assert.match(footer, /className="footer-orbit"/)
  assert.match(footer, /DOYA · LUNA BOHEMIA/)
  assert.match(footer, /<Lockup className="footer-wordmark"/)
  assert.doesNotMatch(footer, /<Stars\b/)
  assert.match(footer, /<footer id="contact"/)
  assert.match(styles, /@keyframes footer-orbit-spin/)
  assert.match(styles, /\.footer-orbit-ring[\s\S]*animation:\s*footer-orbit-spin 34s linear infinite/)
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.footer-orbit-ring[\s\S]*?animation:\s*none/)
})
