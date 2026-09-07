/**
 * URL du logo dans les e-mails.
 * Préférer le CDN Brevo (proxies Gmail/Apple Mail) ; fallback Storage .png.
 */
export const EMAIL_LOGO_BREVO_CDN =
  'https://img.mailinblue.com/12068620/images/rnb/original/6a9eb681d6d15096d2e4c6de.png'

export const EMAIL_LOGO_STORAGE_URL =
  'https://ipphjddgeotsohplzkbo.supabase.co/storage/v1/object/public/email/doya-logo-email.png'

export function emailLogoPublicUrl() {
  return EMAIL_LOGO_BREVO_CDN
}

/** Remplace toute src logo (site, R2, edge, cid, data) par l’URL publique. */
export function rewriteEmailLogoSrc(html: string, logoSrc = emailLogoPublicUrl()) {
  const src = String(logoSrc || '').trim()
  if (!src) return String(html || '')
  return String(html || '')
    .replace(/https?:\/\/img\.mailinblue\.com\/[^"'>\s]+/gi, src)
    .replace(/https?:\/\/[^"'>\s]+\/(?:functions\/v1\/email-logo|storage\/v1\/object\/public\/email\/doya-logo-email\.png|doya-logo-email\.(?:png|svg))/gi, src)
    .replace(/src="\/doya-logo-email\.(?:png|svg)"/gi, `src="${src}"`)
    .replace(/src="cid:[^"]+"/gi, `src="${src}"`)
    .replace(/src="data:image\/png;base64,[^"]+"/gi, `src="${src}"`)
}
