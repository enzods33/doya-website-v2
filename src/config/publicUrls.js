/** Constantes publiques partagées (front + vite.config) - sans secrets. */

/** CDN R2 public (fallback si `VITE_ASSETS_URL` absent). */
export const DEFAULT_ASSETS_BASE_URL = 'https://pub-5b2b2b3b50ba46c485eeff926fa26420.r2.dev'

/** Preview Netlify (robots/sitemap si `VITE_SITE_URL` absent). */
export const STAGING_SITE_URL = 'https://harmonious-hamster-bac94a.netlify.app'

/** Domaine définitif : son activation reste une décision de mise en ligne. */
export const OFFICIAL_SITE_URL = 'https://doyaofficial.com'

/** Un build indexable ne doit jamais rendre une preview ou l'ancienne URL indexable. */
export function isOfficialSiteIndexable(enabled, origin) {
  if (enabled !== true && enabled !== 'true') return false
  try {
    return new URL(origin).origin === OFFICIAL_SITE_URL
  } catch {
    return false
  }
}
