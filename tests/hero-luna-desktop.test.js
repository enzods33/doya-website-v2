import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('l orbite lunaire desktop utilise une position relative à la hauteur du viewport', () => {
  const styles = readFileSync(new URL('../src/styles/hero.css', import.meta.url), 'utf8')

  assert.match(
    styles,
    /@media \(min-width: 768px\)\s*\{[\s\S]*?\.hero-album-stage\s*\{[\s\S]*?--hero-cycle-offset-y:\s*clamp\(7px, 0\.85svh, 10px\);/
  )

  assert.match(
    styles,
    /@media \(min-width: 768px\) and \(max-height: 900px\)[\s\S]*?\.hero-album-stage\s*\{[\s\S]*?--hero-cycle-size:\s*106%;/
  )

  assert.doesNotMatch(
    styles,
    /@media \(min-width: 768px\) and \(max-height: 900px\)[\s\S]*?--hero-cycle-offset-y:\s*3px;/
  )

  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.hero-copy\s*\{[\s\S]*?top:\s*clamp\(4rem, 8svh, 4\.5rem\);/
  )
})
