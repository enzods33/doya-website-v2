import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('la préparation go-live cible doyaofficial.com sans indexer les previews', () => {
  const deploy = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
  const monitoring = readFileSync(new URL('../.github/workflows/monitoring.yml', import.meta.url), 'utf8')
  const netlify = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')

  assert.match(deploy, /VITE_INDEXABLE:\s*'true'/)
  assert.match(monitoring, /DOYA_BASE_URL:\s*https:\/\/doyaofficial\.com/g)
  assert.doesNotMatch(monitoring, /doya\.guzzler-bot\.cloud/)
  assert.match(netlify, /VITE_INDEXABLE\s*=\s*"false"/)
})
