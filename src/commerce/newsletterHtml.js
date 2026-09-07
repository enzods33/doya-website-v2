/** Échappe le texte pour insertion HTML e-mail. */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const DEFAULT_NEWSLETTER_SIGNATURE = '— DOYA'

/** Logo album : CDN Brevo (fiable sur Gmail mobile / Apple Mail). */
export const EMAIL_LOGO_PUBLIC_URL =
  'https://img.mailinblue.com/12068620/images/rnb/original/6a9eb681d6d15096d2e4c6de.png'

function formatMultiline(value) {
  return escapeHtml(String(value || '').trim()).replace(/\n/g, '<br>')
}

function resolveLogoSrc(options = {}) {
  if (options.logoUrl) return String(options.logoUrl).trim()
  const raw = String(options.logoBase || '').trim().replace(/\/$/, '')
  if (raw) return `${raw}/doya-logo-email.png`
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin.replace(/\/$/, '')}/doya-logo-email.png`
  }
  return EMAIL_LOGO_PUBLIC_URL
}

/** En-tête album : DOYA + 2 étoiles rouges au-dessus du O. */
function brandHeaderHtml(options = {}) {
  const logo = resolveLogoSrc(options)
  return `<img src="${escapeHtml(logo)}" width="168" height="150" alt="DOYA" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:168px;height:auto;max-width:55%;" />`
}

/**
 * Construit un HTML e-mail simple (pas de code à écrire côté client).
 * @param {string} bodyText message en texte libre (paragraphes séparés par une ligne vide)
 * @param {{ signature?: string, logoBase?: string, logoUrl?: string }} [options]
 */
export function buildNewsletterHtml(bodyText, options = {}) {
  const signature = String(options.signature ?? DEFAULT_NEWSLETTER_SIGNATURE).trim() || DEFAULT_NEWSLETTER_SIGNATURE
  const trimmed = String(bodyText || '').trim()
  const blocks = trimmed
    ? trimmed.split(/\n\s*\n/).map((block) => {
        const lines = escapeHtml(block.trim()).replace(/\n/g, '<br>')
        return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2c2926;">${lines}</p>`
      })
    : ['<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#2c2926;">&nbsp;</p>']

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f1ec;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e4ddd3;">
          <tr>
            <td align="center" style="padding:28px 28px 8px;">
              ${brandHeaderHtml(options)}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 28px 28px;font-family:Helvetica,Arial,sans-serif;">
              ${blocks.join('\n')}
              <p style="margin:24px 0 0;font-size:14px;line-height:1.5;letter-spacing:.04em;color:#2c2926;">${formatMultiline(signature)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Preheader : champ optionnel, sinon début du message. */
export function resolvePreviewText(previewText, bodyText) {
  const explicit = String(previewText || '').trim()
  if (explicit) return explicit.slice(0, 140)
  const fallback = String(bodyText || '').trim().replace(/\s+/g, ' ')
  return fallback.slice(0, 120)
}
