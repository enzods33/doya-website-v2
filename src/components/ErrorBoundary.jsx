import { Component, useContext } from 'react'
import { I18nContext } from '../i18n/I18nProvider.jsx'
import fr from '../i18n/locales/fr.js'
import { trackEvent } from '../commerce/pageAnalytics.js'
import Link from './Link.jsx'

const FALLBACK = fr.error

function ErrorFallback({ onRetry }) {
  const ctx = useContext(I18nContext)
  const t = ctx?.t
  const label = (key) => (t ? t(`error.${key}`) : FALLBACK[key])

  return (
    <main id="main" className="page-main error-boundary" tabIndex={-1}>
      <div className="page-shell error-boundary-shell">
        <p className="eyebrow section-kicker">{label('kicker')}</p>
        <h1 className="editorial-title page-title">{label('title')}</h1>
        <p className="error-boundary-text">{label('text')}</p>
        <div className="error-boundary-actions">
          <button type="button" className="error-boundary-retry" onClick={onRetry}>
            {label('retry')}
          </button>
          <Link href="/" className="error-boundary-home">{label('home')}</Link>
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
