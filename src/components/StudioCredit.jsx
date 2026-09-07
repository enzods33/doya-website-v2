import reelazuraLogo from '../assets/logos/reelazura-clear.webp'
import { useI18n } from '../i18n/I18nProvider.jsx'

export const REELAZURA_EMAIL = 'reelazura@gmail.com'

function studioMailto(t) {
  return `mailto:${REELAZURA_EMAIL}?subject=${encodeURIComponent(t('studio.subject'))}&body=${encodeURIComponent(t('studio.body'))}`
}

/** @param {{ className?: string }} props */
function StudioCredit({ className = '' }) {
  const { t } = useI18n()

  return (
    <a
      className={`studio-credit ${className}`.trim()}
      href={studioMailto(t)}
      aria-label={t('studio.aria')}
    >
      <span className="studio-credit-label">{t('studio.label')}</span>
      <img
        className="studio-credit-logo"
        src={reelazuraLogo}
        alt=""
        width={872}
        height={294}
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    </a>
  )
}

export default StudioCredit
