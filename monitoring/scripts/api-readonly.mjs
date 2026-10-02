import { kumaPush } from './kuma-push.mjs'

const base = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = process.env.VITE_SUPABASE_ANON_KEY || ''
const site = (process.env.DOYA_BASE_URL || 'https://doyaofficial.com').replace(/\/$/, '')
const started = Date.now()
let ok = false
let message = ''

function hasDirective(value, directive) {
  return String(value || '').toLowerCase().split(',').map((part) => part.trim()).some((part) => part === directive || part.startsWith(`${directive}=`))
}

async function deploymentContractChecks() {
  const htmlResponse = await fetch(`${site}/`, {
    method: 'GET',
    headers: { Accept: 'text/html' },
    redirect: 'manual',
    signal: AbortSignal.timeout(12_000),
  })
  const html = await htmlResponse.text()
  const htmlCache = htmlResponse.headers.get('cache-control') || ''
  const htmlType = htmlResponse.headers.get('content-type') || ''
  const scriptMatches = [...html.matchAll(/<script[^>]+src=["']([^"']+\.js)["']/gi)]
  const assetPath = scriptMatches.map((match) => match[1]).find((src) => src.includes('/assets/'))

  const results = [[
    'site:html-cache',
    `${htmlResponse.status}/${htmlCache || 'no-cache-header'}`,
    htmlResponse.status === 200 && htmlType.includes('text/html') && (hasDirective(htmlCache, 'no-cache') || hasDirective(htmlCache, 'no-store')),
  ]]

  if (!assetPath) {
    results.push(['site:hashed-asset', 'asset-not-found-in-html', false])
  } else {
    const assetUrl = new URL(assetPath, site)
    const assetResponse = await fetch(assetUrl, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
    })
    const assetCache = assetResponse.headers.get('cache-control') || ''
    const assetType = assetResponse.headers.get('content-type') || ''
    results.push([
      'site:hashed-asset',
      `${assetResponse.status}/${assetCache || 'no-cache-header'}`,
      assetResponse.status === 200
        && /javascript|ecmascript/.test(assetType)
        && hasDirective(assetCache, 'immutable')
        && /max-age=31536000/.test(assetCache),
    ])
  }

  const missingResponse = await fetch(`${site}/assets/__doya_monitoring_missing_chunk__.js`, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(12_000),
  })
  const missingCache = missingResponse.headers.get('cache-control') || ''
  const missingType = missingResponse.headers.get('content-type') || ''
  results.push([
    'site:missing-asset',
    `${missingResponse.status}/${missingCache || 'no-cache-header'}`,
    missingResponse.status === 404
      && hasDirective(missingCache, 'no-store')
      && !missingType.includes('text/html'),
  ])

  return results
}

try {
  if (!/^https:\/\/[^/]+\.supabase\.(co|net)$/.test(base) || key.length < 40) {
    throw new Error('Configuration Supabase manquante')
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
  const tables = ['catalog_products', 'catalog_variants', 'catalog_auto_promos', 'shipping_zones']
  const functions = ['create-checkout-session', 'subscribe-newsletter', 'request-shipping-quote', 'admin-auth-check']
  const results = await Promise.all([
    ...tables.map(async (table) => {
      const response = await fetch(`${base}/rest/v1/${table}?select=*&limit=1`, {
        method: 'GET', headers, signal: AbortSignal.timeout(12_000),
      })
      return [`table:${table}`, response.status, response.ok]
    }),
    ...functions.map(async (name) => {
      const response = await fetch(`${base}/functions/v1/${name}`, {
        method: 'OPTIONS',
        headers: { ...headers, Origin: site },
        signal: AbortSignal.timeout(12_000),
      })
      const cors = response.headers.get('access-control-allow-origin')
      return [`function:${name}`, response.status, response.ok && cors === site]
    }),
    ...(await deploymentContractChecks()),
  ])
  const failed = results.filter(([, , passed]) => !passed)
  ok = failed.length === 0
  message = ok
    ? `Catalogue + fonctions + contrat déploiement: ${results.length} OK`
    : failed.map(([name, status]) => `${name}=${status}`).join(', ')
  console.log(message)
} catch (error) {
  message = error.message || String(error)
  console.error(message)
}

const delivery = await kumaPush(process.env.KUMA_PUSH_DOYA_API, {
  status: ok ? 'up' : 'down', msg: message, ping: Date.now() - started,
})
if (!delivery.ok) process.exit(3)
process.exit(ok ? 0 : 1)
