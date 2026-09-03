import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'

function NotFoundPage() {
  const { t } = useI18n()
  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell">
        <p className="eyebrow section-kicker">{t('notFound.kicker')}</p>
        <h1 className="editorial-title page-title">{t('notFound.title')}</h1>
        <p className="page-back"><Link href="/" className="text-link">{t('notFound.home')} <span aria-hidden="true">↗</span></Link></p>
      </div>
    </main>
  )
}

export default NotFoundPage
