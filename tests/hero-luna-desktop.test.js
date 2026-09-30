import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('l orbite lunaire desktop peu haute gagne en taille sans descendre sur les visages', () => {
  const styles = readFileSync(new URL('../src/styles/hero.css', import.meta.url), 'utf8')

  assert.match(
    styles,
    /@media \(min-width: 768px\) and \(max-height: 900px\)[\s\S]*?\.hero-copy\s*\{[^}]*top:\s*2\.75rem;[\s\S]*?\.hero-album-stage\s*\{[\s\S]*?--hero-cycle-size:\s*106%;[\s\S]*?--hero-cycle-offset-y:\s*-2px;/
  )
})
