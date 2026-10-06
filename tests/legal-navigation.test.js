import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('la navigation entre les pages légales reste dans le même écran SPA', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const legal = readFileSync(new URL('../src/pages/LegalPages.jsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../src/pages/LegalNavigation.css', import.meta.url), 'utf8')

  assert.match(app, /const LegalRoutePage = lazy/)
  assert.match(app, /'\/mentions-legales': LegalRoutePage/)
  assert.match(app, /'\/cgv': LegalRoutePage/)
  assert.match(app, /'\/confidentialite': LegalRoutePage/)
  assert.match(app, /<Page path=\{path\} \/>/)

  assert.match(legal, /const LEGAL_DOC_BY_PATH = \{/)
  assert.match(legal, /'\/mentions-legales': 'mentions'/)
  assert.match(legal, /'\/cgv': 'cgv'/)
  assert.match(legal, /'\/confidentialite': 'privacy'/)
  assert.match(legal, /export function LegalRoutePage\(\{ path \}\)/)

  assert.match(styles, /\.legal-doc-nav a\[aria-current="page"\] \{[\s\S]*?border-bottom-color:\s*var\(--color-doya-red\);/)
  assert.doesNotMatch(styles, /\.legal-doc-nav a\[aria-current="page"\] \{[\s\S]*?font-weight:\s*600;/)
})
