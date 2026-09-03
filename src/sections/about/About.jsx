import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import ClassNames from 'embla-carousel-class-names'
import { useReducedMotion } from 'motion/react'
import { siteContent } from '../../data/siteContent.js'
import { galleryImages } from '../../data/media.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Stars, Wordmark } from '../../components/Brand.jsx'
import Reveal from '../../components/Reveal.jsx'

function About() {
  const reducedMotion = useReducedMotion()
  const { t } = useI18n()
  const total = galleryImages.length
  const [index, setIndex] = useState(0)

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'center',
      skipSnaps: false,
      duration: reducedMotion ? 0 : 32,
      dragFree: false,
      watchDrag: !reducedMotion,
    },
    [ClassNames({ snapped: 'is-snapped', draggable: 'is-draggable', dragging: 'is-dragging' })],
  )

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return undefined
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    if (!emblaApi) return undefined
    const root = emblaApi.rootNode()
    const images = [...root.querySelectorAll('img')]

    function refresh() {
      emblaApi.reInit()
    }

    images.forEach((image) => {
      if (image.complete) return
      image.addEventListener('load', refresh, { once: true })
    })

    const observer = new ResizeObserver(() => emblaApi.reInit())
    observer.observe(root)
    return () => {
      observer.disconnect()
      images.forEach((image) => image.removeEventListener('load', refresh))
    }
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi || reducedMotion) return undefined
    const viewport = emblaApi.rootNode()
    let locked = 0

    function onWheel(event) {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      if (!horizontal && !event.shiftKey) return
      const delta = horizontal ? event.deltaX : event.deltaY
      if (Math.abs(delta) < 10) return
      event.preventDefault()
      const now = performance.now()
      if (now - locked < 380) return
      locked = now
      if (delta > 0) emblaApi.scrollNext()
      else emblaApi.scrollPrev()
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [emblaApi, reducedMotion])

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
              <span className="sr-only">{t('photo.of')} </span>
              {String(total).padStart(2, '0')}
            </p>
            <button type="button" onClick={() => emblaApi?.scrollPrev()} aria-label={t('photo.prev')} aria-controls="about-gallery-main">←</button>
            <button type="button" onClick={() => emblaApi?.scrollNext()} aria-label={t('photo.next')} aria-controls="about-gallery-main">→</button>
          </div>

          <div
            id="about-gallery-main"
            className="gallery-embla"
            ref={emblaRef}
            role="region"
            aria-roledescription="carousel"
            aria-label={t('about.eyebrow')}
          >
            <div className="gallery-embla-container">
              {galleryImages.map((image, slideIndex) => (
                <div className="gallery-embla-slide" key={image.src}>
                  <figure className="gallery-embla-figure">
                    <div className="gallery-embla-card">
                      <img
                        src={image.src}
                        width={image.width}
                        height={image.height}
                        alt={slideIndex === index ? image.alt : ''}
                        loading={slideIndex === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        draggable={false}
                      />
                    </div>
                  </figure>
                </div>
              ))}
            </div>
          </div>
          <p className="gallery-embla-caption photo-caption">
            <span>{siteContent.name}</span>
            <span>{siteContent.albumTitle} / {siteContent.year}</span>
          </p>
          <Stars className="gallery-stars" />
        </div>
      </div>
    </section>
  )
}

export default About
