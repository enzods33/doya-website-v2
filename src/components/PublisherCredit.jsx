import almenaLogo from '../assets/logos/almena-prod-clear.webp'
import { trackEvent } from '../commerce/pageAnalytics.js'
import { useI18n } from '../i18n/I18nProvider.jsx'

export const ALMENA_EMAIL = 'almenaprod@gmail.com'

function publisherMailto(t) {
  return `mailto:${ALMENA_EMAIL}?subject=${encodeURIComponent(t('publisher.subject'))}&body=${encodeURIComponent(t('publisher.body'))}`
}

/** @param {{ className?: string }} props */
function PublisherCredit({ className = '' }) {
  const { t } = useI18n()

  return (
    <a
      className={`studio-credit publisher-credit ${className}`.trim()}
      href={publisherMailto(t)}
      aria-label={t('publisher.aria')}
      onClick={() => trackEvent('contact_mail', 'footer')}
    >
      <span className="studio-credit-label">{t('publisher.label')}</span>
      <img
        className="studio-credit-logo publisher-credit-logo"
        src={almenaLogo}
        alt=""
        width={637}
        height={368}
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    </a>
  )
}

export default PublisherCredit
