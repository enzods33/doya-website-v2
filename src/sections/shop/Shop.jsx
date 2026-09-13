import { useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { CART_LIMITS, formatEuros, isUniqueSize } from '../../commerce/cartRules.js'
import { DEFAULT_AUTO_PROMOS, fetchAutoPromos } from '../../commerce/autoPromos.js'
import { availableFor, productImageSrc, resolveProductView } from '../../commerce/catalog.js'
import { useCart } from '../../commerce/CartProvider.jsx'
import { useCatalog } from '../../commerce/CatalogProvider.jsx'
import { commerceMessage, translateProduct } from '../../commerce/messages.js'
import { trackEvent } from '../../commerce/pageAnalytics.js'
import { isExternalUrl } from '../../utils/links.js'
import { siteContent } from '../../data/siteContent.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import Reveal from '../../components/Reveal.jsx'
import TransitionImage from '../../components/TransitionImage.jsx'
import Link from '../../components/Link.jsx'

const TSHIRT_FLIP_MS = 3400
const HOVER_RESUME_MS = 2000
const MOBILE_MANUAL_RESUME_MS = 4000

function finePointerHover() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function Shop() {
  const [views, setViews] = useState({})
  const [manualLock, setManualLock] = useState({})
  const [hoverPaused, setHoverPaused] = useState({})
  const [flipTick, setFlipTick] = useState(0)
  const [selectedSizes, setSelectedSizes] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [zoom, setZoom] = useState(null)
  const [autoPromos, setAutoPromos] = useState(DEFAULT_AUTO_PROMOS)
  const resumeTimers = useRef({})
  const { items, purchasable, revision } = useCatalog()
  const { addItem } = useCart()
  const { t, intlLocale } = useI18n()
  const zoomTitleId = useId()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    let active = true
    fetchAutoPromos().then((promos) => {
      if (active) setAutoPromos(promos)
    })
    return () => { active = false }
  }, [revision])

  function isTshirt(product) {
    return product.typeKey === 'tshirt'
  }

  function clearResumeTimer(id) {
    if (resumeTimers.current[id]) {
      window.clearTimeout(resumeTimers.current[id])
      resumeTimers.current[id] = null
    }
  }

  function unlockManual(id) {
    setManualLock((current) => {
      if (!current[id]) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function pauseAutoOnHover(product) {
    if (!isTshirt(product) || reducedMotion) return
    if (!finePointerHover()) return
    clearResumeTimer(product.id)
    unlockManual(product.id)
    setHoverPaused((current) => (current[product.id] ? current : { ...current, [product.id]: true }))
  }

  function scheduleAutoResume(product) {
    if (!isTshirt(product) || reducedMotion) return
    clearResumeTimer(product.id)
    resumeTimers.current[product.id] = window.setTimeout(() => {
      setHoverPaused((paused) => {
        if (!paused[product.id]) return paused
        const next = { ...paused }
        delete next[product.id]
        return next
      })
      unlockManual(product.id)
      resumeTimers.current[product.id] = null
    }, HOVER_RESUME_MS)
  }

  function setProductView(product, next) {
    if (next === 'front' && !product.front) return
    if (next === 'back' && !product.back) return
    setViews((current) => ({ ...current, [product.id]: next }))
    setManualLock((current) => ({ ...current, [product.id]: true }))
    clearResumeTimer(product.id)
    // Survol : garder la pause auto, mais laisser Face/Dos piloter la vue
    if (isTshirt(product) && !reducedMotion && !finePointerHover()) {
      resumeTimers.current[product.id] = window.setTimeout(() => {
        unlockManual(product.id)
        resumeTimers.current[product.id] = null
      }, MOBILE_MANUAL_RESUME_MS)
    }
  }

  function displayedViewFor(product, index) {
    if (manualLock[product.id] && views[product.id]) {
      return resolveProductView(product, views[product.id])
    }
    if (hoverPaused[product.id]) return resolveProductView(product, 'front')
    if (!isTshirt(product) || reducedMotion) {
      return resolveProductView(product, views[product.id] ?? product.defaultView)
    }
    if (!product.front || !product.back) {
      return resolveProductView(product, product.defaultView)
    }
    return (flipTick + index) % 2 === 0 ? 'front' : 'back'
  }

  function sizesFor(product) {
    if (product.variants?.length) {
      return CART_LIMITS.sizes.filter((size) => product.variants.some((variant) => variant.size === size))
    }
    return CART_LIMITS.sizes.filter((size) => !isUniqueSize(size))
  }

  function sizeLabel(size) {
    const key = `shop.size.${size}`
    const label = t(key)
    return label === key ? size : label
  }

  function addProduct(product, index) {
    const sizes = sizesFor(product)
    const size = selectedSizes[product.id] ?? (sizes.length === 1 ? sizes[0] : null)
    if (!size) {
      setFeedback({ kind: 'error', message: commerceMessage('choose_size', t) })
      return
    }
    const result = addItem(product.id, size, 1, availableFor(product, size))
    if (result.ok) {
      trackEvent('add_to_cart', 'shop')
      setFeedback({
        kind: 'added',
        labels: translateProduct(t, product),
        imageSrc: productImageSrc(product, displayedViewFor(product, index)),
        size,
        price: formatEuros(product.sale.priceCents),
      })
      return
    }
    setFeedback({ kind: 'error', message: commerceMessage(result.error, t) })
  }

  useEffect(() => {
    if (!feedback) return undefined
    const timer = window.setTimeout(() => setFeedback(null), feedback.kind === 'added' ? 6500 : 4200)
    return () => window.clearTimeout(timer)
  }, [feedback])

  useEffect(() => {
    if (reducedMotion) return undefined
    const id = window.setInterval(() => setFlipTick((tick) => tick + 1), TSHIRT_FLIP_MS)
    return () => window.clearInterval(id)
  }, [reducedMotion])

  useEffect(() => () => {
    Object.values(resumeTimers.current).forEach((timer) => {
      if (timer) window.clearTimeout(timer)
    })
  }, [])

  useEffect(() => {
    if (!zoom) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(event) {
      if (event.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [zoom])

  return (
    <section id="shop" className="shop-section section-shell" aria-labelledby="shop-title">
      <Reveal as="header" className="shop-heading">
        <div className="shop-heading-main">
          <h2 id="shop-title" className="editorial-title">{t('shop.title')}</h2>
        </div>
        <div className="shop-heading-meta">
          <p className="eyebrow shop-collection">
            <span>{t('shop.label')}</span>
            <span className="small-separator" aria-hidden="true">/</span>
            <span>{siteContent.albumTitle}</span>
          </p>
        </div>
        {purchasable && autoPromos.length > 0 ? (
          <ul className="shop-promo">
            {autoPromos.map((promo) => (
              <li key={promo.id}>
                {t(promo.shopMessageKey, { amount: formatEuros(promo.amountOffCents) })}
              </li>
            ))}
          </ul>
        ) : null}
      </Reveal>
      <div className="products">
        {items.map((product, index) => {
          const labels = translateProduct(t, product)
          const displayedView = displayedViewFor(product, index)
          const imageSrc = productImageSrc(product, displayedView)
          const sale = product.sale
          const sizes = sizesFor(product)
          const uniqueOnly = sizes.length === 1 && isUniqueSize(sizes[0])
          const hasAnyStock = sizes.some((size) => availableFor(product, size) > 0)
          const productClassName = [
            'product',
            product.typeKey === 'cd' ? 'is-featured' : '',
            product.colorKey === 'white' ? 'is-light-product' : '',
            product.colorKey === 'black' ? 'is-dark-product' : '',
          ].filter(Boolean).join(' ')
          const alt = t('shop.productAlt', {
            type: labels.type,
            name: labels.name,
            color: String(labels.color || labels.type).toLowerCase(),
            view: displayedView === 'front' ? t('shop.viewFrontWord') : t('shop.viewBackWord'),
          })
          return <Reveal as="article" className={productClassName} key={product.id} delay={(index % 2) * 0.08}
            onPointerEnter={() => pauseAutoOnHover(product)}
            onPointerLeave={() => scheduleAutoResume(product)}>
          <button
            type="button"
            className="product-image-trigger"
            onClick={() => setZoom({ product, view: displayedView })}
            aria-label={`${t('shop.zoom')} — ${alt}`}
            disabled={!imageSrc}
          >
            {imageSrc ? (
              <TransitionImage image={{ src: imageSrc, width: product.width, height: product.height }} className="product-image" alt={alt} />
            ) : null}
          </button>
          <div className="product-view-controls" role="group" aria-label={t('shop.viewGroup')}>
            <button type="button" aria-pressed={displayedView === 'front'} disabled={!product.front} onClick={() => setProductView(product, 'front')}>{t('shop.viewFront')}</button>
            <span aria-hidden="true">/</span>
            <button type="button" aria-pressed={displayedView === 'back'} disabled={!product.back} onClick={() => setProductView(product, 'back')}>{t('shop.viewBack')}</button>
          </div>
          <div className="product-caption"><p className="eyebrow">{labels.type}</p><h3>{labels.name}</h3>
            <div className="product-details">
              {labels.color ? <span>{labels.color}</span> : null}
              {sale ? <span>{formatEuros(sale.priceCents)}</span> : product.price !== null && <span>{new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR' }).format(product.price)}</span>}
            </div>
            {sale && (
              <div className="product-buy">
                {hasAnyStock ? (
                  <>
                    {uniqueOnly ? (
                      <p className="size-unique-note product-cd-note">{t('shop.cdSignedNote')}</p>
                    ) : (
                      <div className="size-list" role="group" aria-label={t('shop.sizesAria', { name: labels.name })}>
                        {sizes.map((size) => {
                          const available = availableFor(product, size)
                          return (
                            <button
                              key={size}
                              type="button"
                              disabled={available < 1}
                              aria-pressed={selectedSizes[product.id] === size}
                              onClick={() => setSelectedSizes((current) => ({ ...current, [product.id]: size }))}
                            >
                              {sizeLabel(size)}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    <button type="button" className="commerce-button commerce-button-small" onClick={() => addProduct(product, index)}>{t('shop.add')}</button>
                  </>
                ) : (
                  <p className="size-unique-note product-out-note">{t('shop.soldOut')}</p>
                )}
              </div>
            )}
            {isExternalUrl(product.url) && <a className="text-link" href={product.url} target="_blank" rel="noopener noreferrer">{t('shop.viewPiece')} <span aria-hidden="true">↗</span></a>}
          </div>
        </Reveal>})}
      </div>
      {purchasable && <p className="availability-note shop-note">{t('shop.stripeNote')}</p>}
      {feedback?.kind === 'error' ? (
        <aside className="shop-error-toast" role="alert" aria-live="assertive">
          <span className="shop-error-mark" aria-hidden="true">!</span>
          <div>
            <strong>{feedback.message}</strong>
            <small>{t('shop.chooseSizeHint')}</small>
          </div>
          <button type="button" onClick={() => setFeedback(null)} aria-label={t('shop.addedClose')}>×</button>
        </aside>
      ) : null}

      {feedback?.kind === 'added' ? (
        <aside className="cart-toast" role="status" aria-live="polite">
          <div className="cart-toast-media" aria-hidden="true">
            {feedback.imageSrc ? <img src={feedback.imageSrc} alt="" width="112" height="112" /> : null}
            <span>✓</span>
          </div>
          <div className="cart-toast-copy">
            <span className="cart-toast-status">{t('shop.addedTitle')}</span>
            <strong>{feedback.labels.name}</strong>
            <small>{t('shop.addedSize', { size: sizeLabel(feedback.size) })} · {feedback.price}</small>
            <Link href="/panier" className="cart-toast-link">{t('shop.viewCart')} <span aria-hidden="true">↗</span></Link>
          </div>
          <button type="button" className="cart-toast-close" onClick={() => setFeedback(null)} aria-label={t('shop.addedClose')}>×</button>
        </aside>
      ) : null}

      {zoom ? (() => {
        const labels = translateProduct(t, zoom.product)
        const view = resolveProductView(zoom.product, zoom.view)
        const src = productImageSrc(zoom.product, view)
        return (
          <div className="product-zoom" role="dialog" aria-modal="true" aria-labelledby={zoomTitleId}>
            <button type="button" className="product-zoom-backdrop" aria-label={t('shop.zoomClose')} onClick={() => setZoom(null)} />
            <div className="product-zoom-panel">
              <div className="product-zoom-top">
                <p id={zoomTitleId} className="product-zoom-title">{labels.name} · {labels.color}</p>
                <button type="button" className="product-zoom-close" onClick={() => setZoom(null)}>{t('shop.zoomClose')} <span aria-hidden="true">×</span></button>
              </div>
              {src ? (
                <img src={src} alt={t('shop.productAlt', { type: labels.type, name: labels.name, color: labels.color.toLowerCase(), view: view === 'front' ? t('shop.viewFrontWord') : t('shop.viewBackWord') })} width={zoom.product.width} height={zoom.product.height} />
              ) : null}
              <div className="product-view-controls product-zoom-controls" role="group" aria-label={t('shop.viewGroup')}>
                <button type="button" aria-pressed={view === 'front'} disabled={!zoom.product.front} onClick={() => setZoom((current) => ({ ...current, view: 'front' }))}>{t('shop.viewFront')}</button>
                <span aria-hidden="true">/</span>
                <button type="button" aria-pressed={view === 'back'} disabled={!zoom.product.back} onClick={() => setZoom((current) => ({ ...current, view: 'back' }))}>{t('shop.viewBack')}</button>
              </div>
            </div>
          </div>
        )
      })() : null}
    </section>
  )
}

export default Shop
