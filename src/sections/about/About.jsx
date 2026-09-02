import { siteContent } from '../../data/siteContent.js'
import { media } from '../../data/media.js'
import { Stars, Wordmark } from '../../components/Brand.jsx'
import Photo from '../../components/Photo.jsx'
import Reveal from '../../components/Reveal.jsx'

function About() {
  return (
    <section id="about" className="about-section section-shell" aria-labelledby="about-title">
      <div className="about-label"><p className="eyebrow">À propos</p><Stars /></div>
      <figure className="about-photo"><Photo image={media.about} /></figure>
      <Reveal className="about-copy" delay={0.1}>
        <h2 id="about-title"><span className="sr-only">DOYA</span><Wordmark decorative className="about-wordmark" /></h2>
        <p className="about-album editorial-title">{siteContent.albumTitle}</p>
        <p className="eyebrow">{siteContent.year}</p>
        {siteContent.biography ? <p className="about-biography">{siteContent.biography}</p> : <p className="availability-note about-biography">{siteContent.biographyPlaceholder}</p>}
      </Reveal>
    </section>
  )
}

export default About
