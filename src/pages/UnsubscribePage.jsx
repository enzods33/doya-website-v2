import { useEffect, useState } from 'react'
import { commerceMutationsAllowed, supabaseAnonKey, supabaseUrl } from '../commerce/config.js'
import { useI18n } from '../i18n/I18nProvider.jsx'

const copy = {
  fr: { title: 'Se désabonner', text: 'Tu ne recevras plus la newsletter DOYA.', action: 'Confirmer le désabonnement', busy: 'En cours…', success: 'Ton désabonnement est enregistré.', error: 'Ce lien est invalide ou le service est indisponible. Réessaie ou contacte DOYA.', home: 'Retour au site' },
  en: { title: 'Unsubscribe', text: 'You will no longer receive the DOYA newsletter.', action: 'Confirm unsubscribe', busy: 'Processing…', success: 'You have been unsubscribed.', error: 'This link is invalid or the service is unavailable. Try again or contact DOYA.', home: 'Back to site' },
  es: { title: 'Cancelar suscripción', text: 'Ya no recibirás la newsletter de DOYA.', action: 'Confirmar', busy: 'Procesando…', success: 'Se ha cancelado tu suscripción.', error: 'El enlace no es válido o el servicio no está disponible. Inténtalo de nuevo o contacta con DOYA.', home: 'Volver al sitio' },
  pt: { title: 'Cancelar subscrição', text: 'Deixarás de receber a newsletter DOYA.', action: 'Confirmar', busy: 'A processar…', success: 'A tua subscrição foi cancelada.', error: 'A ligação é inválida ou o serviço não está disponível. Tenta novamente ou contacta a DOYA.', home: 'Voltar ao site' },
  de: { title: 'Abmelden', text: 'Du erhältst den DOYA-Newsletter nicht mehr.', action: 'Abmeldung bestätigen', busy: 'Wird verarbeitet…', success: 'Deine Abmeldung wurde gespeichert.', error: 'Dieser Link ist ungültig oder der Dienst ist nicht verfügbar. Versuche es erneut oder kontaktiere DOYA.', home: 'Zurück zur Seite' },
  ja: { title: '配信停止', text: '今後DOYAのニュースレターは届きません。', action: '配信停止を確認', busy: '処理中…', success: '配信停止を受け付けました。', error: 'リンクが無効、またはサービスを利用できません。もう一度試すかDOYAへお問い合わせください。', home: 'サイトに戻る' },
  ko: { title: '구독 해지', text: '앞으로 DOYA 뉴스레터를 받지 않습니다.', action: '구독 해지 확인', busy: '처리 중…', success: '구독 해지가 완료되었습니다.', error: '링크가 유효하지 않거나 서비스를 이용할 수 없습니다. 다시 시도하거나 DOYA에 문의하세요.', home: '사이트로 돌아가기' },
  zh: { title: '退订', text: '你将不再收到 DOYA 新闻邮件。', action: '确认退订', busy: '处理中…', success: '退订已完成。', error: '链接无效或服务暂时不可用。请重试或联系 DOYA。', home: '返回主页' },
  ar: { title: 'إلغاء الاشتراك', text: 'لن تتلقى نشرة DOYA بعد الآن.', action: 'تأكيد إلغاء الاشتراك', busy: 'جارٍ التنفيذ…', success: 'تم إلغاء اشتراكك.', error: 'الرابط غير صالح أو الخدمة غير متاحة. حاول مجددًا أو تواصل مع DOYA.', home: 'العودة للموقع' },
}

export default function UnsubscribePage() {
  const { locale } = useI18n()
  const c = copy[locale] ?? copy.fr
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '')

  useEffect(() => {
    if (token) window.history.replaceState({}, '', '/desabonnement')
  }, [token])

  async function unsubscribe(event) {
    event.preventDefault()
    if (!commerceMutationsAllowed || !token) { setStatus('error'); return }
    setBusy(true)
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/unsubscribe-newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({ token }),
      })
      if (!response.ok) throw new Error('unsubscribe_failed')
      setStatus('success')
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell">
        <h1 className="editorial-title page-title">{c.title}</h1>
        <p>{c.text}</p>
        {status === 'success' ? (
          <p role="status" style={{ margin: '2rem 0' }}>{c.success}</p>
        ) : status === 'error' || !token ? (
          <p role="alert" style={{ margin: '2rem 0', color: 'var(--color-error, #d32f2f)' }}>
            {c.error}
          </p>
        ) : (
          <form onSubmit={unsubscribe} style={{ margin: '2rem 0' }}>
            <button type="submit" className="commerce-button" disabled={busy || !token}>
              {busy ? c.busy : c.action}
            </button>
          </form>
        )}
        
        <div style={{ marginTop: '2rem' }}>
          <a href="/" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '4px', fontSize: '0.9rem' }}>
            {c.home}
          </a>
        </div>
      </div>
    </main>
  )
}
