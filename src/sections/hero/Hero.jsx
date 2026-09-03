import { media } from '../../data/media.js'
import { siteContent } from '../../data/siteContent.js'
import { Stars } from '../../components/Brand.jsx'
import Photo from '../../components/Photo.jsx'
import { editorialEase } from '../../utils/motion.js'
import letterD from '../../assets/logos/glyphs/doya-d-white.svg'
import letterO from '../../assets/logos/glyphs/doya-o-white.svg'
import letterY from '../../assets/logos/glyphs/doya-y-white.svg'
import letterA from '../../assets/logos/glyphs/doya-a-white.svg'

function Hero() {
  const reducedMotion = useReducedMotion()
  const letters = [{ src: letterD, name: 'd' }, { src: letterO, name: 'o' }, { src: letterY, name: 'y' }, { src: letterA, name: 'a' }]
  return (
    <section className="hero" aria-labelledby="hero-title">
      <Photo image={media.hero} className="hero-photo" fetchPriority="high" eager />
      <div className="hero-letters" aria-hidden="true">
        {letters.map((letter, index) => <m.img key={letter.name} src={letter.src} alt="" className={`hero-letter letter-${letter.name}`}
          initial={reducedMotion ? false : { opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 1.1, delay: reducedMotion ? 0 : 0.12 + index * 0.11, ease: editorialEase }} />)}
      </div>
      <div className="hero-caption">
        <m.div initial={reducedMotion ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 1, delay: reducedMotion ? 0 : 0.5, ease: editorialEase }}>
        <div className="hero-stars"><Stars /></div>
        <p className="hero-subtitle">{siteContent.heroLabel}</p>
        <h1 id="hero-title">{siteContent.albumTitle}</h1>
        <div className="hero-cta-group">
          <a href="#music" className="hero-cta">{siteContent.discoverLabel} <span aria-hidden="true">↗</span></a>
          <a href="#live" className="hero-cta">Prochaines dates <span aria-hidden="true">↗</span></a>
        </div>
        </m.div>
      </div>
      <span className="hero-index eyebrow" aria-hidden="true">DOYA / 2026</span>
    </section>
  )
}

export default Hero
import { m, useReducedMotion } from 'motion/react'
