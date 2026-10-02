import { useEffect, useState } from 'react'
import { confirmNewsletter } from '../commerce/newsletter.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'

const copy = {
  fr: {
    title: 'Confirmation newsletter',
    checking: 'Confirmation de ton inscription…',
    success: 'Ton inscription est confirmée. Bienvenue dans la boucle DOYA !',
    error: 'Ce lien est invalide ou a expiré. Tu peux refaire une inscription depuis le site.',
    home: 'Retour au site',
  },
  en: {
    title: 'Newsletter confirmation',
    checking: 'Confirming your subscription…',
    success: 'Your subscription is confirmed. Welcome to the DOYA circle!',
    error: 'This link is invalid or has expired. You can sign up again from the website.',
    home: 'Back to the website',
  },
  es: {
    title: 'Confirmación de newsletter',
    checking: 'Confirmando tu inscripción…',
    success: 'Tu inscripción está confirmada. ¡Bienvenido/a al círculo DOYA!',
    error: 'Este enlace no es válido o ha caducado. Puedes volver a inscribirte desde la web.',
    home: 'Volver al sitio',
  },
  pt: {
    title: 'Confirmação da newsletter',
    checking: 'A confirmar a tua inscrição…',
    success: 'A tua inscrição está confirmada. Bem-vindo/a ao círculo DOYA!',
    error: 'Este link é inválido ou expirou. Podes voltar a inscrever-te no site.',
    home: 'Voltar ao site',
  },
  de: {
    title: 'Newsletter bestätigen',
    checking: 'Deine Anmeldung wird bestätigt…',
    success: 'Deine Anmeldung ist bestätigt. Willkommen im DOYA-Kreis!',
    error: 'Dieser Link ist ungültig oder abgelaufen. Du kannst dich auf der Website erneut anmelden.',
    home: 'Zurück zur Website',
  },
  ja: {
    title: 'ニュースレター登録確認',
    checking: '登録を確認しています…',
    success: '登録が確認されました。DOYAサークルへようこそ！',
    error: 'このリンクは無効か期限切れです。サイトからもう一度登録できます。',
    home: 'サイトに戻る',
  },
  ko: {
    title: '뉴스레터 구독 확인',
    checking: '구독을 확인하고 있습니다…',
    success: '구독이 확인되었습니다. DOYA 서클에 오신 것을 환영합니다!',
    error: '링크가 유효하지 않거나 만료되었습니다. 사이트에서 다시 구독할 수 있습니다.',
    home: '사이트로 돌아가기',
  },
  zh: {
    title: '确认新闻订阅',
    checking: '正在确认你的订阅…',
    success: '订阅已确认。欢迎加入 DOYA！',
    error: '此链接无效或已过期。你可以返回网站重新订阅。',
    home: '返回网站',
  },
  ar: {
    title: 'تأكيد الاشتراك في النشرة',
    checking: 'جارٍ تأكيد اشتراكك…',
    success: 'تم تأكيد اشتراكك. مرحبًا بك في دائرة DOYA!',
    error: 'هذا الرابط غير صالح أو انتهت صلاحيته. يمكنك التسجيل من جديد عبر الموقع.',
    home: 'العودة إلى الموقع',
  },
}

function tokenFromLocation() {
  return new URLSearchParams(window.location.search).get('token')?.trim() ?? ''
}

export default function NewsletterConfirmationPage() {
  const { locale } = useI18n()
  const c = copy[locale] ?? copy.fr
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const token = tokenFromLocation()
    if (!token) {
      setStatus('error')
      return
    }

    let cancelled = false
    async function run() {
      // Brevo redirige après validation. Un très court délai de propagation
      // peut exister avant que le contact apparaisse dans la liste.
      for (const delay of [0, 600, 1600]) {
        if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay))
        if (cancelled) return
        try {
          await confirmNewsletter(token)
          if (!cancelled) setStatus('success')
          return
        } catch (error) {
          if (error?.status !== 409) {
            if (!cancelled) setStatus('error')
            return
          }
        }
      }
      if (!cancelled) setStatus('error')
    }

    run()
    return () => { cancelled = true }
  }, [])

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <section className="legal-page" aria-labelledby="newsletter-confirm-title">
        <div className="legal-page-inner">
          <p className="eyebrow">DOYA</p>
          <h1 id="newsletter-confirm-title">{c.title}</h1>
          <p role="status">
            {status === 'checking' ? c.checking : status === 'success' ? c.success : c.error}
          </p>
          <p><Link href="/">{c.home}</Link></p>
        </div>
      </section>
    </main>
  )
}
