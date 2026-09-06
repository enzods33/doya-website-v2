import { useCallback, useEffect, useId, useRef } from 'react'
import { m, useMotionValue, useReducedMotion } from 'motion/react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { editorialEase } from '../utils/motion.js'

const MIN_ZOOM = 1
const MAX_ZOOM = 3.2

/**
 * Lightbox photo : zoom molette / pinch, pan si zoomé, nav ← →, Escape.
 */
function PhotoLightbox({ images, index, onClose, onIndexChange }) {
  const { t } = useI18n()
  const titleId = useId()
  const reducedMotion = useReducedMotion()
  const scale = useMotionValue(1)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const pinchRef = useRef(null)
  const image = images[index]
  const total = images.length

  const resetView = useCallback(() => {
    scale.set(1)
    x.set(0)
    y.set(0)
  }, [scale, x, y])

  useEffect(() => {
    resetView()
  }, [index, resetView])

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + total) % total)
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % total)
      if (event.key === '0') resetView()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [index, onClose, onIndexChange, resetView, total])

  function clampZoom(value) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  }

  function onWheel(event) {
    event.preventDefault()
    const current = scale.get()
    const next = clampZoom(current + (event.deltaY < 0 ? 0.2 : -0.2))
    scale.set(next)
    if (next <= MIN_ZOOM) {
      x.set(0)
      y.set(0)
    }
  }

  function onDoubleClick() {
    if (scale.get() > 1.05) resetView()
    else scale.set(2.1)
  }

  function onTouchStart(event) {
    if (event.touches.length !== 2) return
    const [a, b] = event.touches
    pinchRef.current = {
      distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
      zoom: scale.get(),
    }
  }

  function onTouchMove(event) {
    if (event.touches.length !== 2 || !pinchRef.current) return
    event.preventDefault()
    const [a, b] = event.touches
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    const next = clampZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance))
    scale.set(next)
    if (next <= MIN_ZOOM) {
      x.set(0)
      y.set(0)
    }
  }

  function onTouchEnd() {
    pinchRef.current = null
  }

  if (!image) return null

  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="photo-lightbox-backdrop" aria-label={t('photo.close')} onClick={onClose} />
      <div className="photo-lightbox-chrome">
        <p id={titleId} className="photo-lightbox-count">
          {String(index + 1).padStart(2, '0')}
          <span aria-hidden="true"> — </span>
          <span className="visually-hidden">{t('photo.of')} </span>
          {String(total).padStart(2, '0')}
        </p>
        <div className="photo-lightbox-actions">
          <button type="button" onClick={resetView}>{t('photo.resetZoom')}</button>
          <button type="button" className="photo-lightbox-close" onClick={onClose}>
            {t('photo.close')} <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      <button
        type="button"
        className="photo-lightbox-nav is-prev"
        onClick={() => onIndexChange((index - 1 + total) % total)}
        aria-label={t('photo.prev')}
      >
        ←
      </button>
      <button
        type="button"
        className="photo-lightbox-nav is-next"
        onClick={() => onIndexChange((index + 1) % total)}
        aria-label={t('photo.next')}
      >
        →
      </button>
      <div
        className="photo-lightbox-stage"
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <m.img
          key={image.src}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          className="photo-lightbox-image"
          drag
          dragConstraints={{ left: -520, right: 520, top: -520, bottom: 520 }}
          dragElastic={0.12}
          style={{ scale, x, y }}
          initial={reducedMotion ? false : { opacity: 0.35 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.32, ease: editorialEase }}
          draggable={false}
        />
      </div>
      <p className="photo-lightbox-hint">{t('photo.zoomHint')}</p>
    </div>
  )
}

export default PhotoLightbox
