import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, m, useMotionValue, useReducedMotion } from 'motion/react'
import { siteContent } from '../../data/siteContent.js'
import { galleryImages } from '../../data/media.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Stars, Wordmark } from '../../components/Brand.jsx'
import Reveal from '../../components/Reveal.jsx'
import PhotoLightbox from '../../components/PhotoLightbox.jsx'
import { editorialEase } from '../../utils/motion.js'

const SLIDE_RATIO = 0.72

function About() {
  const reducedMotion = useReducedMotion()
  const { t } = useI18n()
  const total = galleryImages.length
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const [metrics, setMetrics] = useState({ width: 0, slide: 0 })
  const viewportRef = useRef(null)
  const x = useMotionValue(0)

  const offsetFor = useCallback((i, width, slide) => {
    if (!width || !slide) return 0
    const centerPad = (width - slide) / 2
    return -(i * slide) + centerPad
  }, [])

  const goTo = useCallback((nextIndex, instant = false) => {
    const i = ((nextIndex % total) + total) % total
    setIndex(i)
    const target = offsetFor(i, metrics.width, metrics.slide)
    if (instant || reducedMotion) {
      x.set(target)
      return
    }
    animate(x, target, { type: 'spring', stiffness: 280, damping: 34, mass: 0.85 })
  }, [metrics.slide, metrics.width, offsetFor, reducedMotion, total, x])

  useLayoutEffect(() => {
    const node = viewportRef.current
    if (!node) return undefined
    function measure() {
      const width = node.clientWidth
      const slide = Math.round(width * SLIDE_RATIO)
      setMetrics({ width, slide })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!metrics.width) return
    x.set(offsetFor(index, metrics.width, metrics.slide))
    // Reposition only on resize / first measure — goTo() anime les changements d’index.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- index volontairement omis
  }, [metrics.width, metrics.slide, offsetFor, x])

  function onDragEnd(_, info) {
    if (!metrics.slide) return
    const projected = x.get() + info.velocity.x * 0.16
    const centerPad = (metrics.width - metrics.slide) / 2
    const raw = (-projected + centerPad) / metrics.slide
    let nearest = Math.round(raw)
    if (nearest < 0) nearest = total - 1
    else if (nearest >= total) nearest = 0
    else nearest = Math.min(total - 1, Math.max(0, nearest))
    goTo(nearest)
  }

  return (
    <section id="about" className="about-section" aria-labelledby="about-title">
      <div className="section-shell about-intro">
        <Reveal className="about-copy" delay={0.1}>
          <h2 id="about-title" className="editorial-title about-title">{t('about.eyebrow')}</h2>
          <Wordmark decorative className="about-wordmark" />
          <p className="about-album">{siteContent.albumTitle}</p>
          <p className="eyebrow">{siteContent.year}</p>
          {siteContent.biography && <p className="about-biography">{siteContent.biography}</p>}
        </Reveal>
      </div>

      <div className="about-gallery">
        <div className="section-shell">
          <div className="gallery-controls about-gallery-controls">
            <p className="eyebrow" aria-live="polite" aria-atomic="true">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span aria-hidden="true"> — </span>
              <span className="visually-hidden">{t('photo.of')} </span>
              {String(total).padStart(2, '0')}
            </p>
            <button type="button" onClick={() => goTo(index - 1)} aria-label={t('photo.prev')} aria-controls="about-gallery-main">←</button>
            <button type="button" onClick={() => goTo(index + 1)} aria-label={t('photo.next')} aria-controls="about-gallery-main">→</button>
          </div>

          <div
            id="about-gallery-main"
            className="about-gallery-viewport"
            ref={viewportRef}
            role="region"
            aria-roledescription="carousel"
            aria-label={t('about.eyebrow')}
          >
            <m.div
              className="about-gallery-track"
              style={{ x }}
              drag={reducedMotion ? false : 'x'}
              dragElastic={0.12}
              dragMomentum={false}
              onDragEnd={onDragEnd}
            >
              {galleryImages.map((image, slideIndex) => {
                const active = slideIndex === index
                return (
                  <div
                    className={`about-gallery-slide${active ? ' is-active' : ''}`}
                    key={image.src}
                    style={{ width: metrics.slide || undefined }}
                  >
                    <button
                      type="button"
                      className="about-gallery-card"
                      onClick={() => {
                        if (active) setLightbox(slideIndex)
                        else goTo(slideIndex)
                      }}
                      aria-label={active ? t('photo.zoom') : t('photo.goTo', { n: slideIndex + 1 })}
                    >
                      <m.img
                        src={image.src}
                        width={image.width}
                        height={image.height}
                        alt={active ? image.alt : ''}
                        loading={slideIndex < 3 ? 'eager' : 'lazy'}
                        decoding="async"
                        draggable={false}
                        animate={reducedMotion ? undefined : {
                          scale: active ? 1 : 0.92,
                          opacity: active ? 1 : 0.62,
                        }}
                        transition={{ duration: 0.45, ease: editorialEase }}
                      />
                    </button>
                  </div>
                )
              })}
            </m.div>
          </div>
          <p className="about-gallery-caption photo-caption">
            <span>{siteContent.name}</span>
            <span>{siteContent.albumTitle} / {siteContent.year}</span>
          </p>
          <Stars className="gallery-stars" />
        </div>
      </div>

      {lightbox !== null && (
        <PhotoLightbox
          images={galleryImages}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      )}
    </section>
  )
}

export default About
