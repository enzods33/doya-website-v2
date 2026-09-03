import { socials, listenSocials, networkSocials } from '../data/socials.js'
import { contacts, pressKit } from '../data/contacts.js'
import { siteContent } from '../data/siteContent.js'
import { isExternalUrl } from '../utils/links.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Stars, Wordmark } from './Brand.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import { PlatformIcon } from './PlatformIcon.jsx'

function mailto(email, subject) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`
}

function SocialRow({ items }) {
  return (
    <ul className="socials">
      {items.map((social) => (
        <li key={social.name}>
          {isExternalUrl(social.url)
            ? <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.name}><PlatformIcon id={social.id} /></a>
            : <span>{social.name}</span>}
        </li>
      ))}
    </ul>
  )
}

function Footer() {
  const { t } = useI18n()
  const missingLinks = socials.every((social) => !isExternalUrl(social.url))
  const pressReady = typeof pressKit.href === 'string' && pressKit.href.trim().length > 0
  const kit = {
    label: t('contact.pressKit.label'),
    note: t('contact.pressKit.note'),
    pendingNote: t('contact.pressKit.pendingNote'),
    cta: t('contact.pressKit.cta'),
  }

  return (
    <footer id="contact" className="site-footer">
      <div className="section-shell">
        <div className="footer-brand">
          <a href="#top" aria-label={t('a11y.footerHome')}><Wordmark className="footer-wordmark" /></a>
          <Stars className="footer-stars" />
          <p className="footer-album">{siteContent.albumTitle} <span aria-hidden="true">·</span> {siteContent.year}</p>
        </div>

        <div className="footer-contact" aria-label={t('a11y.footerContact')}>
          {contacts.map((contact) => {
            const label = t(`contact.${contact.id}.label`)
            const note = t(`contact.${contact.id}.note`)
            const subject = t(`contact.${contact.id}.subject`)
            const cta = t(`contact.${contact.id}.cta`)
            return (
              <article key={contact.id} className="footer-contact-item">
                <p className="eyebrow">{label}</p>
                <p className="footer-contact-note">{note}</p>
                <a className="footer-cta" href={mailto(contact.email, subject)} aria-label={t('contact.ctaAria', { cta, label })}>
                  {cta}
                </a>
              </article>
            )
          })}
          <article className={`footer-contact-item${pressReady ? '' : ' is-pending'}`}>
            <p className="eyebrow">{kit.label}</p>
            <p className="footer-contact-note">{pressReady ? kit.note : kit.pendingNote}</p>
            {pressReady ? (
              <a className="footer-cta" href={pressKit.href} download>{kit.cta}</a>
            ) : (
              <span className="footer-cta is-disabled" aria-disabled="true">{kit.cta}</span>
            )}
          </article>
        </div>

        <nav className="footer-socials" aria-label={t('a11y.footerSocials')}>
          <SocialRow items={listenSocials} />
          <SocialRow items={networkSocials} />
          {missingLinks && <p className="footer-note">{t('footer.missingLinks')}</p>}
        </nav>

        <div className="footer-meta">
          <p className="copyright">{t('footer.copyright', { year: siteContent.year })}</p>
          <LanguageSwitcher className="footer-language-switcher" />
          <a href="#top" className="back-to-top">{t('footer.backToTop')} <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </footer>
  )
}

export default Footer
