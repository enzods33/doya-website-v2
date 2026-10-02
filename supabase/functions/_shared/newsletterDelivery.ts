import { signNewsletterAddress } from './newsletterUnsubscribe.ts'

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

/** Chaque version a exactement un destinataire, avec un lien personnel. */
export async function newsletterMessageVersions(
  emails: string[], html: string, siteUrl: string, secret: string, lang: string,
): Promise<{ to: { email: string }[]; htmlContent: string }[]> {
  if (emails.length > 1000) throw new Error('list_too_large')
  const label = UNSUBSCRIBE_LABELS[lang] ?? UNSUBSCRIBE_LABELS.fr
  return Promise.all(emails.map(async (email) => {
    const token = await signNewsletterAddress(email, secret)
    const url = `${siteUrl}/desabonnement?token=${encodeURIComponent(token)}`
    const footer = `<p style="margin:28px 0 0;font-size:13px;line-height:1.5;"><a href="${url}" style="color:#2c2926;">${label}</a></p>`
    return {
      to: [{ email }],
      htmlContent: /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${footer}</body>`) : `${html}${footer}`,
    }
  }))
}
