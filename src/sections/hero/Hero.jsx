import { m, useReducedMotion } from 'motion/react'
import { media } from '../../data/media.js'
import { siteContent } from '../../data/siteContent.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Stars } from '../../components/Brand.jsx'
import Photo from '../../components/Photo.jsx'
import { editorialEase } from '../../utils/motion.js'
import letterD from '../../assets/logos/glyphs/doya-d-white.svg'
import letterO from '../../assets/logos/glyphs/doya-o-white.svg'
import letterY from '../../assets/logos/glyphs/doya-y-white.svg'
import letterA from '../../assets/logos/glyphs/doya-a-white.svg'

function Hero() {
  const reducedMotion = useReducedMotion()
  const { t } = useI18n()
  const letters = [{ src: letterD, name: 'd' }, { src: letterO, name: 'o' }, { src: letterY, name: 'y' }, { src: letterA, name: 'a' }]
  return (
    <section className="hero" aria-labelledby="hero-title">
      <Photo image={media.hero} className="hero-backdrop" fetchPriority="high" eager aria-hidden="true" />
      <div className="hero-photo-frame">
        <Photo image={media.hero} className="hero-photo" fetchPriority="high" eager />
      </div>
      <div className="hero-letters" aria-hidden="true">
        {letters.map((letter, index) => (
          <m.img
            key={letter.name}
            src={letter.src}
            alt=""
            className={`hero-letter letter-${letter.name}`}
            initial={reducedMotion ? false : { opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1.1, delay: reducedMotion ? 0 : 0.12 + index * 0.11, ease: editorialEase }}
          />
        ))}
      </div>
      <div className="hero-copy">
        <div className="hero-caption">
          <m.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1, delay: reducedMotion ? 0 : 0.5, ease: editorialEase }}
          >
            <p className="hero-subtitle">{t('hero.label')}</p>
            <h1 id="hero-title">{siteContent.albumTitle}</h1>
            <div className="hero-stars"><Stars color="white" /></div>
          </m.div>
        </div>
        <div className="hero-cta-group">
          <m.div
            className="hero-cta-inner"
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 1, delay: reducedMotion ? 0 : 0.62, ease: editorialEase }}
          >
            <div className="hero-cta-primary">
              <a href="#music" className="hero-cta hero-cta-discover">{t('hero.discover')}</a>
              <a href="#live" className="hero-cta hero-cta-desktop-only">{t('hero.datesDesktop')}</a>
            </div>
            <a href="#shop" className="hero-cta hero-cta-merch hero-cta-desktop-only">{t('hero.shop')}</a>
            <div className="hero-cta-pair">
              <a href="#live" className="hero-cta">{t('hero.dates')}</a>
              <a href="#shop" className="hero-cta">{t('hero.shop')}</a>
            </div>
          </m.div>
        </div>
      </div>
    </section>
  )
}

export default Hero
