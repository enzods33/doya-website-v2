import type { NewsletterLocale } from './newsletterWelcome.ts'

type ConfirmationCopy = {
  subject: string
  preview: string
  title: string
  body: string
  action: string
}

export const CONFIRMATION_COPY: Record<NewsletterLocale, ConfirmationCopy> = {
  fr: { subject: 'Confirme ton inscription DOYA', preview: 'Un clic pour rejoindre le cercle DOYA.', title: 'Confirme ton inscription', body: 'Clique sur le bouton ci-dessous pour confirmer ton inscription à la newsletter DOYA.', action: 'Confirmer mon inscription' },
  es: { subject: 'Confirma tu suscripción a DOYA', preview: 'Un clic para unirte al círculo DOYA.', title: 'Confirma tu suscripción', body: 'Haz clic en el botón para confirmar tu suscripción a la newsletter de DOYA.', action: 'Confirmar mi suscripción' },
  en: { subject: 'Confirm your DOYA subscription', preview: 'One click to join the DOYA circle.', title: 'Confirm your subscription', body: 'Click the button below to confirm your subscription to the DOYA newsletter.', action: 'Confirm my subscription' },
  pt: { subject: 'Confirma a tua subscrição DOYA', preview: 'Um clique para entrares no círculo DOYA.', title: 'Confirma a tua subscrição', body: 'Clica no botão abaixo para confirmares a tua subscrição da newsletter DOYA.', action: 'Confirmar a minha subscrição' },
  de: { subject: 'Bestätige deine DOYA-Anmeldung', preview: 'Ein Klick, um dem DOYA-Kreis beizutreten.', title: 'Anmeldung bestätigen', body: 'Klicke auf die Schaltfläche, um deine Anmeldung zum DOYA-Newsletter zu bestätigen.', action: 'Anmeldung bestätigen' },
  ja: { subject: 'DOYAニュースレター登録の確認', preview: 'ワンクリックでDOYAサークルに参加できます。', title: '登録を確認してください', body: '下のボタンをクリックして、DOYAニュースレターへの登録を確認してください。', action: '登録を確認する' },
  ko: { subject: 'DOYA 뉴스레터 구독 확인', preview: '한 번의 클릭으로 DOYA 서클에 참여하세요.', title: '구독을 확인해 주세요', body: '아래 버튼을 눌러 DOYA 뉴스레터 구독을 확인해 주세요.', action: '구독 확인' },
  zh: { subject: '确认订阅 DOYA', preview: '点击一次即可加入 DOYA。', title: '确认订阅', body: '点击下方按钮，确认订阅 DOYA 新闻邮件。', action: '确认订阅' },
  ar: { subject: 'تأكيد الاشتراك في DOYA', preview: 'نقرة واحدة للانضمام إلى دائرة DOYA.', title: 'أكّد اشتراكك', body: 'اضغط على الزر أدناه لتأكيد اشتراكك في نشرة DOYA.', action: 'تأكيد الاشتراك' },
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function confirmationEmailHtml(locale: NewsletterLocale, confirmUrl: string, logoUrl: string) {
  const copy = CONFIRMATION_COPY[locale]
  const rtl = locale === 'ar'
  const dir = rtl ? 'rtl' : 'ltr'
  const align = rtl ? 'right' : 'left'
  return `<!DOCTYPE html>
<html lang="${locale === 'zh' ? 'zh-CN' : locale}" dir="${dir}"><head><meta charset="utf-8"></head>
<body dir="${dir}" style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1ec;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" dir="${dir}" style="max-width:560px;background:#ffffff;border:1px solid #e4ddd3;text-align:${align};">
<tr><td align="center" style="padding:28px 28px 8px;"><img src="${escapeHtml(logoUrl)}" width="168" height="150" alt="DOYA" style="display:block;margin:0 auto;border:0;width:168px;height:auto;max-width:55%;" /></td></tr>
<tr><td style="padding:8px 28px 28px;font-family:Arial,Tahoma,sans-serif;">
<p style="margin:0 0 18px;font-size:22px;${rtl ? 'letter-spacing:0;' : 'letter-spacing:.06em;text-transform:uppercase;'}color:#2c2926;">${escapeHtml(copy.title)}</p>
<p style="margin:0 0 22px;font-size:16px;line-height:1.55;color:#2c2926;">${escapeHtml(copy.body)}</p>
<p style="margin:0;"><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:13px 18px;background:#2c2926;color:#fff;text-decoration:none;font-size:14px;letter-spacing:.06em;text-transform:uppercase;">${escapeHtml(copy.action)}</a></p>
</td></tr></table></td></tr></table></body></html>`
}
