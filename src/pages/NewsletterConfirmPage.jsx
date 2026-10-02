import { useEffect, useState } from 'react'
import { commerceConfigured, supabaseAnonKey, supabaseUrl } from '../commerce/config.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'

const copy = {
  fr: { title: 'Confirmation newsletter', loading: 'Confirmation en cours…', success: 'Ton inscription à la newsletter DOYA est confirmée.', error: 'Ce lien est invalide, expiré ou le service est momentanément indisponible.', back: 'Retour au site' },
  en: { title: 'Newsletter confirmation', loading: 'Confirming…', success: 'Your DOYA newsletter subscription is confirmed.', error: 'This link is invalid, expired, or the service is temporarily unavailable.', back: 'Back to the site' },
  es: { title: 'Confirmación de newsletter', loading: 'Confirmando…', success: 'Tu suscripción a la newsletter de DOYA está confirmada.', error: 'Este enlace no es válido, ha caducado o el servicio no está disponible temporalmente.', back: 'Volver al sitio' },
  pt: { title: 'Confirmação da newsletter', loading: 'A confirmar…', success: 'A tua subscrição da newsletter DOYA está confirmada.', error: 'Esta ligação é inválida, expirou ou o serviço está temporariamente indisponível.', back: 'Voltar ao site' },
  de: { title: 'Newsletter-Bestätigung', loading: 'Wird bestätigt…', success: 'Deine Anmeldung zum DOYA-Newsletter ist bestätigt.', error: 'Dieser Link ist ungültig, abgelaufen oder der Dienst ist vorübergehend nicht verfügbar.', back: 'Zurück zur Website' },
  ja: { title: 'ニュースレター登録確認', loading: '確認中…', success: 'DOYAニュースレターへの登録が確認されました。', error: 'リンクが無効、期限切れ、またはサービスを一時的に利用できません。', back: 'サイトへ戻る' },
  ko: { title: '뉴스레터 구독 확인', loading: '확인 중…', success: 'DOYA 뉴스레터 구독이 확인되었습니다.', error: '링크가 유효하지 않거나 만료되었거나 서비스를 일시적으로 이용할 수 없습니다.', back: '사이트로 돌아가기' },
  zh: { title: '确认新闻邮件订阅', loading: '正在确认…', success: '你的 DOYA 新闻邮件订阅已确认。', error: '链接无效、已过期或服务暂时不可用。', back: '返回网站' },
  ar: { title: 'تأكيد النشرة', loading: 'جارٍ التأكيد…', success: 'تم تأكيد اشتراكك في نشرة DOYA.', error: 'الرابط غير صالح أو منتهي الصلاحية أو الخدمة غير متاحة مؤقتًا.', back: 'العودة إلى الموقع' },
}

export default function NewsletterConfirmPage() {
  const { locale } = useI18n()
  const c = copy[locale] ?? copy.fr
  const [status, setStatus] = useState('loading')
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')

  useEffect(() => {
    if (token) window.history.replaceState({}, '', '/confirmation-newsletter')
    if (!commerceConfigured || !token) {
      setStatus('error')
      return undefined
    }

    let active = true
    fetch(`${supabaseUrl}/functions/v1/confirm-newsletter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ token }),
    })
      .then((response) => {
        if (!response.ok) throw new Error('confirm_failed')
        if (active) setStatus('success')
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => { active = false }
  }, [token])

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell">
        <h1 className="editorial-title page-title">{c.title}</h1>
        {status === 'loading' ? <p role="status">{c.loading}</p> : null}
        {status === 'success' ? <p role="status">{c.success}</p> : null}
        {status === 'error' ? <p role="alert">{c.error}</p> : null}
        <p className="page-back"><Link href="/" className="text-link">{c.back} <span aria-hidden="true">↗</span></Link></p>
      </div>
    </main>
  )
}
