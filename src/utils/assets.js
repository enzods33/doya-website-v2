import { DEFAULT_ASSETS_BASE_URL } from '../config/publicUrls.js'

/** Base CDN R2 (sans slash final). Préfère `VITE_ASSETS_URL`, sinon défaut. */
export const assetsBaseUrl = String(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASSETS_URL) || DEFAULT_ASSETS_BASE_URL,
).replace(/\/$/, '')

/** URL publique d’un objet R2, ex. assetUrl('shop/web/cd-front.jpg') */
export function assetUrl(path) {
  const clean = String(path ?? '').replace(/^\/+/, '')
  if (!assetsBaseUrl || !clean) return ''
  const encoded = clean.split('/').map((segment) => encodeURIComponent(segment)).join('/')
  return `${assetsBaseUrl}/${encoded}`
}
