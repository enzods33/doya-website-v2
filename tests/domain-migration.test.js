import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { isOfficialSiteIndexable, OFFICIAL_SITE_URL } from '../src/config/publicUrls.js'

const OLD_SITE = 'https://doya.guzzler-bot.cloud'

test('indexation : activation explicite et domaine officiel uniquement', () => {
  for (const enabled of [false, 'false', undefined, '', 'TRUE']) {
    assert.equal(isOfficialSiteIndexable(enabled, OFFICIAL_SITE_URL), false)
  }
  assert.equal(isOfficialSiteIndexable('true', OFFICIAL_SITE_URL), true)
  assert.equal(isOfficialSiteIndexable(true, `${OFFICIAL_SITE_URL}/`), true)
  for (const origin of [OLD_SITE, 'https://www.doyaofficial.com', 'http://doyaofficial.com',
    'http://localhost:5174', 'https://harmonious-hamster-bac94a.netlify.app',
    'https://doyaofficial.com.evil.invalid', '', undefined]) {
    assert.equal(isOfficialSiteIndexable('true', origin), false)
  }
})

// Exécute les vrais helpers Edge dans une sandbox sans accès au réseau ni à Supabase.
function edgeHttp(siteUrl) {
  const source = readFileSync(new URL('../supabase/functions/_shared/http.ts', import.meta.url), 'utf8')
  const limits = readFileSync(new URL('../supabase/functions/_shared/limits.ts', import.meta.url), 'utf8')
  const transpile = (value) => stripTypeScriptTypes(value).replace(/^export /gm, '')
  return runInNewContext(`${transpile(limits)}\n${transpile(source.replace(/^import[^\r\n]*\r?\n/gm, ''))}\n({ publicSiteUrl, checkoutReturnOrigin, corsHeaders, preflight, rejectOrigin })`, {
    URL, Response, Request,
    Deno: { env: { get: (name) => name === 'SITE_URL' ? siteUrl : undefined } },
  })
}

for (const [label, primary, secondary] of [
  ['avant la bascule', OLD_SITE, OFFICIAL_SITE_URL],
  ['après la bascule', OFFICIAL_SITE_URL, OLD_SITE],
]) {
  test(`retours Stripe, liens e-mails et CORS sur les deux domaines ${label}`, () => {
    const http = edgeHttp(`${primary},${secondary}`)
    assert.equal(http.publicSiteUrl(), primary)
    for (const origin of [OLD_SITE, OFFICIAL_SITE_URL]) {
      assert.equal(http.checkoutReturnOrigin(origin), origin)
      assert.equal(http.corsHeaders(origin)['Access-Control-Allow-Origin'], origin)
      const request = new Request(`${OFFICIAL_SITE_URL}/`, { method: 'OPTIONS', headers: { origin } })
      assert.equal(http.preflight(request).status, 200)
      assert.equal(http.rejectOrigin(request), null)
    }
    const unknown = 'https://untrusted.invalid'
    assert.equal(http.checkoutReturnOrigin(unknown), primary)
    assert.equal(http.corsHeaders(unknown)['Access-Control-Allow-Origin'], undefined)
    assert.equal(http.rejectOrigin(new Request(OFFICIAL_SITE_URL, { headers: { origin: unknown } })).status, 403)
  })
}
