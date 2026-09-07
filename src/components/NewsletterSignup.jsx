import { useState } from 'react'
import { subscribeNewsletter } from '../commerce/newsletter.js'
import { commerceConfigured } from '../commerce/config.js'
import { isValidEmail } from '../commerce/cartRules.js'
import { useI18n } from '../i18n/I18nProvider.jsx'

function NewsletterSignup({ className = '' }) {
  const { t, locale } = useI18n()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  async function onSubmit(event) {
    event.preventDefault()
    setStatus(null)
    if (!commerceConfigured) {
      setStatus({ kind: 'error', message: t('newsletter.unavailable') })
      return
    }
    if (!isValidEmail(email)) {
      setStatus({ kind: 'error', message: t('newsletter.invalidEmail') })
      return
    }
    setBusy(true)
    try {
      const result = await subscribeNewsletter(email, locale)
      setStatus({
        kind: 'ok',
        message: result.already ? t('newsletter.already') : t('newsletter.success'),
      })
      setEmail('')
    } catch {
      setStatus({ kind: 'error', message: t('newsletter.error') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={`newsletter-signup ${className}`.trim()} aria-labelledby="newsletter-title">
      <div className="newsletter-signup-copy">
        <p className="eyebrow">{t('newsletter.kicker')}</p>
        <h2 id="newsletter-title" className="newsletter-signup-title">{t('newsletter.title')}</h2>
        <p className="newsletter-signup-text">{t('newsletter.text')}</p>
      </div>
      <form className="newsletter-signup-form" onSubmit={onSubmit}>
        <label className="newsletter-signup-field">
          <span className="visually-hidden">{t('newsletter.email')}</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            disabled={busy}
            placeholder={t('newsletter.placeholder')}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button type="submit" className="newsletter-signup-submit" disabled={busy}>
          {busy ? t('newsletter.sending') : t('newsletter.submit')}
        </button>
      </form>
      {status ? (
        <p className={`newsletter-signup-status is-${status.kind}`} role="status">
          {status.message}
        </p>
      ) : null}
    </section>
  )
}

export default NewsletterSignup
