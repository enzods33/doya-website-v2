import { kumaPush } from './kuma-push.mjs'

const base = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = process.env.VITE_SUPABASE_ANON_KEY || ''
const site = process.env.DOYA_BASE_URL || 'https://doya.guzzler-bot.cloud'
const started = Date.now()
let ok = false
let message = ''

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
  ])
  const failed = results.filter(([, , passed]) => !passed)
  ok = failed.length === 0
  message = ok ? `GET catalogue + OPTIONS fonctions: ${results.length} OK` : failed.map(([n, s]) => `${n}=${s}`).join(', ')
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
