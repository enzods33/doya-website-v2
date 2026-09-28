import { useEffect, useState } from 'react'
import { commerceConfigured, supabaseAnonKey, supabaseUrl } from '../commerce/config.js'
import { useI18n } from '../i18n/I18nProvider.jsx'

const copy = {
  fr: { title: 'Se désabonner', text: 'Tu ne recevras plus la newsletter DOYA.', action: 'Confirmer le désabonnement', busy: 'En cours…', success: 'Ton désabonnement est enregistré.', error: 'Ce lien est invalide ou le service est indisponible. Réessaie ou contacte DOYA.' },
  en: { title: 'Unsubscribe', text: 'You will no longer receive the DOYA newsletter.', action: 'Confirm unsubscribe', busy: 'Processing…', success: 'You have been unsubscribed.', error: 'This link is invalid or the service is unavailable. Try again or contact DOYA.' },
  es: { title: 'Cancelar suscripción', text: 'Ya no recibirás la newsletter de DOYA.', action: 'Confirmar', busy: 'Procesando…', success: 'Se ha cancelado tu suscripción.', error: 'El enlace no es válido o el servicio no está disponible. Inténtalo de nuevo o contacta con DOYA.' },
  pt: { title: 'Cancelar subscrição', text: 'Deixarás de receber a newsletter DOYA.', action: 'Confirmar', busy: 'A processar…', success: 'A tua subscrição foi cancelada.', error: 'A ligação é inválida ou o serviço não está disponível. Tenta novamente ou contacta a DOYA.' },
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
    if (!commerceConfigured || !token) { setStatus('error'); return }
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
        {status === 'success' ? <p role="status">{c.success}</p> : (
          <form onSubmit={unsubscribe}>
            <button type="submit" className="commerce-button" disabled={busy || !token}>
              {busy ? c.busy : c.action}
            </button>
            {status === 'error' || !token ? <p role="alert">{c.error}</p> : null}
          </form>
        )}
      </div>
    </main>
  )
}
