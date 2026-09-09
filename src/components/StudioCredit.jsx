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
      className={`studio-credit studio-credit--text ${className}`.trim()}
      href={studioMailto(t)}
      aria-label={t('studio.aria')}
    >
      <span className="studio-credit-text">{t('studio.credit')}</span>
    </a>
  )
}

export default StudioCredit
