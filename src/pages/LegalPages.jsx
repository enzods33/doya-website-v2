import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'

/** @param {{ doc: 'mentions' | 'cgv' | 'privacy' }} props */
function LegalPage({ doc }) {
  const { t } = useI18n()
  const prefix = `legal.${doc}`
  const sections = t(`${prefix}.sections`)
  const list = Array.isArray(sections) ? sections : []

  return (
    <main id="main" className="page-main legal-page" tabIndex={-1}>
      <div className="page-shell legal-shell">
        <header className="legal-header">
          <p className="eyebrow section-kicker">{t(`${prefix}.kicker`)}</p>
          <h1 className="editorial-title page-title">{t(`${prefix}.title`)}</h1>
          <p className="legal-updated">{t('legal.updated')}</p>
          <p className="legal-intro">{t(`${prefix}.intro`)}</p>
        </header>

        {list.map((section, index) => (
          <section key={`${section.heading}-${index}`} className="legal-section" id={`legal-${doc}-${index + 1}`}>
            <h2>
              <span className="legal-article-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              {section.heading}
            </h2>
            {(section.paragraphs ?? []).map((paragraph, pIndex) => (
              <p key={`${doc}-${index}-${pIndex}`}>{paragraph}</p>
            ))}
          </section>
        ))}

        <p className="page-back">
          <Link href="/" className="text-link">{t('legal.backHome')} <span aria-hidden="true">↗</span></Link>
        </p>
      </div>
    </main>
  )
}

export function MentionsLegalesPage() {
  return <LegalPage doc="mentions" />
}

export function CgvPage() {
  return <LegalPage doc="cgv" />
}

export function PrivacyPage() {
  return <LegalPage doc="privacy" />
}
