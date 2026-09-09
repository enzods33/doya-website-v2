import { Component } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { trackEvent } from '../commerce/pageAnalytics.js'
import Link from './Link.jsx'

function ErrorFallback({ onRetry }) {
  const { t } = useI18n()
  return (
    <main id="main" className="page-main error-boundary" tabIndex={-1}>
      <div className="page-shell error-boundary-shell">
        <p className="eyebrow section-kicker">{t('error.kicker')}</p>
        <h1 className="editorial-title page-title">{t('error.title')}</h1>
        <p className="error-boundary-text">{t('error.text')}</p>
        <div className="error-boundary-actions">
          <button type="button" className="error-boundary-retry" onClick={onRetry}>
            {t('error.retry')}
          </button>
          <Link href="/" className="error-boundary-home">{t('error.home')}</Link>
        </div>
      </div>
    </main>
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    try {
      trackEvent('app_error', 'boundary')
    } catch {
      /* analytics optional */
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          onRetry={() => {
            this.setState({ error: null })
          }}
        />
      )
    }
    return this.props.children
  }
}
