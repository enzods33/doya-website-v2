import { useEffect, useRef, useState } from 'react'
import { m, useReducedMotion } from 'motion/react'
import { media } from '../../data/media.js'
import { siteContent } from '../../data/siteContent.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Stars } from '../../components/Brand.jsx'
import Link from '../../components/Link.jsx'
import Photo from '../../components/Photo.jsx'
import { editorialEase } from '../../utils/motion.js'
import { navigate } from '../../utils/router.js'
import letterD from '../../assets/logos/glyphs/doya-d-white.svg'
import letterO from '../../assets/logos/glyphs/doya-o-white.svg'
import letterY from '../../assets/logos/glyphs/doya-y-white.svg'
import letterA from '../../assets/logos/glyphs/doya-a-white.svg'
import lunaPhases from '../../assets/hero/luna-phases.webp'

function useUltraWideHero() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-aspect-ratio: 2/1)')
    const sync = () => setEnabled(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  return enabled
}

function Hero() {
  const reducedMotion = useReducedMotion()
  const showBackdrop = useUltraWideHero()
  const { t } = useI18n()
  const letters = [{ src: letterD, name: 'd' }, { src: letterO, name: 'o' }, { src: letterY, name: 'y' }, { src: letterA, name: 'a' }]
  const starsClicks = useRef({ count: 0, timer: 0 })

  function onStarsActivate() {
    const state = starsClicks.current
    window.clearTimeout(state.timer)
    state.count += 1
    if (state.count >= 3) {
      state.count = 0
      navigate('/admin')
      return
    }
    state.timer = window.setTimeout(() => {
      state.count = 0
    }, 900)
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      {showBackdrop ? (
        <Photo image={media.hero} className="hero-backdrop" fetchPriority="low" eager aria-hidden="true" />
      ) : null}
      <div className="hero-photo-frame">
        <Photo
          image={media.hero}
          className={`hero-photo${reducedMotion ? '' : ' hero-photo-cinematic'}`}
          fetchPriority="high"
          eager
        />
      </div>
      <div className="hero-letters" aria-hidden="true">
        {letters.map((letter, index) => (
          <m.img
            key={letter.name}
            src={letter.src}
            alt=""
            className={`hero-letter letter-${letter.name}`}
            initial={reducedMotion ? false : { opacity: 0, y: 28, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{
              duration: reducedMotion ? 0 : 1.15,
              delay: reducedMotion ? 0 : 0.18 + index * 0.13,
              ease: editorialEase,
            }}
          />
        ))}
      </div>
      <div className="hero-copy">
        <m.div
          className="hero-album-stage"
          initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.94, clipPath: 'circle(4% at 50% 50%)' }}
          animate={{ opacity: 1, y: 0, scale: 1, clipPath: 'circle(72% at 50% 50%)' }}
          transition={{ duration: reducedMotion ? 0 : 1.05, delay: reducedMotion ? 0 : 0.28, ease: editorialEase }}
        >
          <div className="hero-cycle-frame" aria-hidden="true">
            <img src={lunaPhases} alt="" className="hero-luna" />
          </div>
          <div className="hero-caption">
            <m.div
              initial={reducedMotion ? false : { opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 1.05, delay: reducedMotion ? 0 : 0.72, ease: editorialEase }}
            >
              <p className="hero-subtitle">{t('hero.label')}</p>
              <h1 id="hero-title">{siteContent.albumTitle}</h1>
              <button
                type="button"
                className="hero-stars"
                onClick={onStarsActivate}
                aria-label={t('hero.label')}
              >
                <Stars color="white" />
              </button>
            </m.div>
          </div>
          <div className="hero-cta-group">
            <div className="hero-cta-inner">
              <m.div
                className="hero-cta-lead"
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.85, delay: reducedMotion ? 0 : 1.02, ease: editorialEase }}
              >
                <Link href="#music" className="hero-cta hero-cta-discover">{t('hero.discover')}</Link>
              </m.div>
              <m.div
                className="hero-cta-pair"
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 1.2, ease: editorialEase }}
              >
                <Link href="#live" className="hero-cta hero-cta-secondary">{t('hero.dates')}</Link>
                <Link href="#shop" className="hero-cta hero-cta-secondary">{t('hero.shop')}</Link>
              </m.div>
            </div>
          </div>
        </m.div>
      </div>
      <Link href="#music" className="hero-scroll-cue" aria-label={t('hero.discover')}>
        <span>{t('hero.scroll')}</span>
        <i aria-hidden="true" />
      </Link>
    </section>
  )
}

export default Hero
