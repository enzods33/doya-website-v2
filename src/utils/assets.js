/** Base CDN R2 (sans slash final). Ex. https://pub-….r2.dev */
export const assetsBaseUrl = String(import.meta.env?.VITE_ASSETS_URL ?? '').replace(/\/$/, '')

/** URL publique d’un objet R2, ex. assetUrl('shop/cd-luna-bohemia-front.jpg') */
export function assetUrl(path) {
  const clean = String(path ?? '').replace(/^\/+/, '')
  if (!assetsBaseUrl || !clean) return ''
  return `${assetsBaseUrl}/${clean}`
}

export function hasRemoteAssets() {
  return Boolean(assetsBaseUrl)
}
