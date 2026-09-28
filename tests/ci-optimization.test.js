import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

test('monitoring: API toutes les 15 min, Playwright horaire dans un seul job',()=>{
  const y=readFileSync(new URL('../.github/workflows/monitoring.yml',import.meta.url),'utf8')
  assert.ok(y.includes("- cron: '9 * * * *'"))
  assert.ok(y.includes("- cron: '24,39,54 * * * *'"))
  assert.ok(y.includes("github.event.schedule == '9 * * * *'"))
  assert.doesNotMatch(y,/matrix:/)
  assert.match(y,/run-and-push\.mjs public/)
  assert.match(y,/run-and-push\.mjs commerce/)
  assert.match(y,/run-and-push\.mjs integrations/)
})

test('le déploiement GitHub Pages parallèle est retiré',()=>{
  assert.equal(existsSync(new URL('../.github/workflows/pages.yml',import.meta.url)),false)
})
