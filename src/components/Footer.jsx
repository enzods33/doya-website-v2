import { socials } from '../data/socials.js'
import { siteContent } from '../data/siteContent.js'
import { isExternalUrl } from '../utils/links.js'
import { Stars, Wordmark } from './Brand.jsx'

function Footer() {
  const missingLinks = socials.every((social) => !isExternalUrl(social.url))
  return (
    <footer className="site-footer"><div className="section-shell">
      <div className="footer-top"><a href="#top" aria-label="DOYA — retour en haut"><Wordmark light className="footer-wordmark" /></a><Stars className="footer-stars" /><a href="#top" className="back-to-top" aria-label="Retour en haut">↑</a></div>
      <div className="footer-bottom"><div><ul className="socials">{socials.map((social) => <li key={social.name}>{isExternalUrl(social.url) ? <a href={social.url} target="_blank" rel="noopener noreferrer">{social.name}</a> : <span>{social.name}</span>}</li>)}</ul>{missingLinks && <p className="footer-note">Liens officiels à renseigner.</p>}</div><p className="copyright">{siteContent.legal}</p></div>
    </div></footer>
  )
}

export default Footer
