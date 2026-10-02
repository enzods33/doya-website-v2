import { serviceClient } from './clients.ts'
import { hashNewsletterToken, newOpaqueNewsletterToken } from './newsletterTokens.ts'

type AdminClient = ReturnType<typeof serviceClient>

const UNSUBSCRIBE_LABELS: Record<string, string> = {
  fr: 'Se désabonner',
  es: 'Cancelar suscripción',
  pt: 'Cancelar subscrição',
  en: 'Unsubscribe',
  de: 'Abmelden',
  ja: '配信停止',
  ko: '구독 해지',
  zh: '退订',
  ar: 'إلغاء الاشتراك',
}

/** Chaque version a exactement un destinataire et un token opaque dédié. */
export async function newsletterMessageVersions(
  admin: AdminClient,
  emails: string[],
  html: string,
  siteUrl: string,
  lang: string,
): Promise<{ to: { email: string }[]; htmlContent: string }[]> {
  if (emails.length > 1000) throw new Error('list_too_large')

  const prepared = await Promise.all(emails.map(async (rawEmail) => {
    const email = rawEmail.trim().toLowerCase()
    const token = newOpaqueNewsletterToken()
    const tokenHash = await hashNewsletterToken(token)
    return { email, token, tokenHash }
  }))

  if (prepared.length) {
    const { error } = await admin
      .from('newsletter_unsubscribe_tokens')
      .insert(prepared.map((item) => ({ token_hash: item.tokenHash, email: item.email })))
    if (error) {
      console.error('newsletter_unsubscribe_tokens_insert_failed', error)
      throw new Error('newsletter_unsubscribe_token_failed')
    }
  }

  const label = UNSUBSCRIBE_LABELS[lang] ?? UNSUBSCRIBE_LABELS.fr
  return prepared.map(({ email, token }) => {
    const url = `${siteUrl}/desabonnement?token=${encodeURIComponent(token)}`
    const footer = `<p style="margin:28px 0 0;font-size:13px;line-height:1.5;"><a href="${url}" style="color:#2c2926;">${label}</a></p>`
    return {
      to: [{ email }],
      htmlContent: /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : `${html}${footer}`,
    }
  })
}
