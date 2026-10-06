import { useI18n } from '../i18n/I18nProvider.jsx'
import './Mediation.css'
import './LegalNavigation.css'
import Link from '../components/Link.jsx'

const LEGAL_DOCUMENTS = [
  { doc: 'mentions', href: '/mentions-legales', label: 'footer.legalMentions' },
  { doc: 'cgv', href: '/cgv', label: 'footer.legalCgv' },
  { doc: 'privacy', href: '/confidentialite', label: 'footer.legalPrivacy' },
]

function LegalNavigation({ doc, bottom = false }) {
  const { t } = useI18n()
  return (
    <nav className={`legal-doc-nav${bottom ? ' legal-doc-nav-bottom' : ''}`} aria-label={t('a11y.footerLegal')}>
      {LEGAL_DOCUMENTS.map((item) => (
        <Link key={item.doc} href={item.href} aria-current={doc === item.doc ? 'page' : undefined}>
          {t(item.label)}
        </Link>
      ))}
    </nav>
  )
}

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

        <LegalNavigation doc={doc} />

        {list.map((section, index) => (
          <section key={`${section.heading}-${index}`} className="legal-section" id={`legal-${doc}-${index + 1}`}>
            <h2>
              <span className="legal-article-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              {section.heading}
            </h2>
            {(section.paragraphs ?? []).map((paragraph, pIndex) => (
              <p key={`${doc}-${index}-${pIndex}`}>{paragraph}</p>
            ))}
            {section.mediation && doc === 'cgv' && (
              <div className="legal-mediation">
                <div className="legal-mediation-details">
                  <h3>{t('legal.mediation.title')}</h3>
                  <p><strong>CM2C</strong><br />Centre de la Médiation de la Consommation de Conciliateurs de Justice</p>
                  <p><bdi>49 rue de Ponthieu, 75008 Paris</bdi><br />
                    <a href="mailto:contact@cm2c.net"><bdi>contact@cm2c.net</bdi></a><br />
                    <a href="tel:+33189470014"><bdi>01 89 47 00 14</bdi></a>
                  </p>
                  <a className="text-link" href="https://www.cm2c.net/" target="_blank" rel="noopener noreferrer">{t('legal.mediation.link')} · <bdi>cm2c.net</bdi></a>
                </div>
                <a className="legal-mediation-qr" href="https://www.cm2c.net/" target="_blank" rel="noopener noreferrer" aria-label={t('legal.mediation.link')}>
                  <img src="/cm2c-qr.svg" width="132" height="132" alt="" loading="lazy" />
                </a>
              </div>
            )}
          </section>
        ))}

        <LegalNavigation doc={doc} bottom />

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
