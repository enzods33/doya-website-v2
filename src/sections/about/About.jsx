import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { siteContent } from '../../data/siteContent.js'
import { galleryImages as fallbackGallery } from '../../data/media.js'
import { loadBioGallery } from '../../commerce/bioPhotos.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Stars, Wordmark } from '../../components/Brand.jsx'
import Reveal from '../../components/Reveal.jsx'
import PhotoLightbox from '../../components/PhotoLightbox.jsx'

function About() {
  const reducedMotion = useReducedMotion()
  const { t } = useI18n()
  const [images, setImages] = useState(fallbackGallery)
  const total = images.length
  const [index, setIndex] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const viewportRef = useRef(null)
  const slideRefs = useRef([])
  const pointerRef = useRef({ x: 0, y: 0, moved: false })

  useEffect(() => {
    let cancelled = false
    loadBioGallery().then((next) => {
      if (!cancelled && Array.isArray(next) && next.length) {
        setImages(next)
        setIndex(0)
      }
    })
    return () => { cancelled = true }
  }, [])

  const scrollToIndex = useCallback((nextIndex, behavior = 'smooth') => {
    const i = ((nextIndex % total) + total) % total
    const slide = slideRefs.current[i]
    const viewport = viewportRef.current
    if (!slide || !viewport) return
    const left = slide.offsetLeft - (viewport.clientWidth - slide.offsetWidth) / 2
    viewport.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? 'auto' : behavior })
    setIndex(i)
  }, [reducedMotion, total])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined

    let frame = 0
    let settleTimer = 0

    function syncIndex() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewportRect = viewport.getBoundingClientRect()
        const center = viewportRect.left + viewportRect.width / 2
        let best = 0
        let bestDist = Infinity
        slideRefs.current.forEach((slide, i) => {
          if (!slide) return
          const rect = slide.getBoundingClientRect()
          const mid = rect.left + rect.width / 2
          const dist = Math.abs(mid - center)
          if (dist < bestDist) {
            bestDist = dist
            best = i
          }
        })
        setIndex((current) => (current === best ? current : best))
      })
    }

    function onScroll() {
      syncIndex()
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(syncIndex, 120)
    }

    function onSettle() {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(syncIndex, 80)
    }

    viewport.addEventListener('scroll', onScroll, { passive: true })
    viewport.addEventListener('scrollend', syncIndex)
    viewport.addEventListener('touchend', onSettle, { passive: true })
    viewport.addEventListener('pointerup', onSettle)
    syncIndex()

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('scrollend', syncIndex)
      viewport.removeEventListener('touchend', onSettle)
      viewport.removeEventListener('pointerup', onSettle)
    }
  }, [images])

  function onPointerDown(event) {
    pointerRef.current = { x: event.clientX, y: event.clientY, moved: false }
  }

  function onPointerMove(event) {
    const dx = Math.abs(event.clientX - pointerRef.current.x)
    const dy = Math.abs(event.clientY - pointerRef.current.y)
    if (dx > 10 || dy > 10) pointerRef.current.moved = true
  }

  function onSlideActivate(slideIndex) {
    if (pointerRef.current.moved) return
    if (slideIndex === index) setLightbox(slideIndex)
    else scrollToIndex(slideIndex)
  }

  if (!total) return null

  return (
    <section id="about" className="about-section" aria-labelledby="about-title">
      <div className="section-shell about-intro">
        <Reveal className="about-copy" delay={0.1}>
          <p className="eyebrow section-kicker">{siteContent.albumTitle} · {siteContent.year}</p>
          <h2 id="about-title" className="editorial-title about-title">{t('about.eyebrow')}</h2>
          <Wordmark decorative className="about-wordmark" />
          {siteContent.biography && <p className="about-biography">{siteContent.biography}</p>}
        </Reveal>
      </div>

      <div className="about-gallery">
        <div className="about-gallery-toolbar section-shell">
          <p className="eyebrow about-gallery-count" aria-live="polite" aria-atomic="true">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span aria-hidden="true"> / </span>
            <span className="visually-hidden">{t('photo.of')} </span>
            <span>{String(total).padStart(2, '0')}</span>
          </p>
          <div className="about-gallery-nav" role="group" aria-label={t('about.eyebrow')}>
            <button type="button" onClick={() => scrollToIndex(index - 1)} aria-label={t('photo.prev')} aria-controls="about-gallery-main">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square" />
              </svg>
            </button>
            <button type="button" onClick={() => scrollToIndex(index + 1)} aria-label={t('photo.next')} aria-controls="about-gallery-main">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M8.5 4.5 16 12l-7.5 7.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="square" />
              </svg>
            </button>
          </div>
        </div>

        <div
          id="about-gallery-main"
          className="about-gallery-viewport"
          ref={viewportRef}
          role="region"
          aria-roledescription="carousel"
          aria-label={t('about.eyebrow')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
        >
          <div className="about-gallery-track">
            {images.map((image, slideIndex) => {
              const active = slideIndex === index
              const portrait = image.height >= image.width
              return (
                <div
                  className={`about-gallery-slide${active ? ' is-active' : ''}${portrait ? ' is-portrait' : ' is-landscape'}`}
                  key={`${image.src}-${slideIndex}`}
                  ref={(node) => { slideRefs.current[slideIndex] = node }}
                >
                  <button
                    type="button"
                    className="about-gallery-card"
                    onClick={() => onSlideActivate(slideIndex)}
                    aria-label={active ? t('photo.zoom') : t('photo.goTo', { n: slideIndex + 1 })}
                  >
                    <img
                      src={image.src}
                      width={image.width}
                      height={image.height}
                      alt={active ? image.alt : ''}
                      loading={slideIndex < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      draggable={false}
                    />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <div className="about-gallery-footer section-shell">
          <div className="about-gallery-progress" aria-hidden="true">
            <span style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
          <p className="about-gallery-caption">
            <span>{siteContent.name}</span>
            <span aria-hidden="true">·</span>
            <span>{siteContent.albumTitle}</span>
          </p>
          <Stars className="gallery-stars" />
        </div>
      </div>

      {lightbox !== null && (
        <PhotoLightbox
          images={images}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      )}
    </section>
  )
}

export default About
