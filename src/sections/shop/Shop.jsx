import { useEffect, useId, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { formatEuros } from '../../commerce/cartRules.js'
import { DEFAULT_AUTO_PROMOS, fetchAutoPromos } from '../../commerce/autoPromos.js'
import { availableFor, productImageSrc, resolveProductView } from '../../commerce/catalog.js'
import { useCart } from '../../commerce/CartProvider.jsx'
import { useCatalog } from '../../commerce/CatalogProvider.jsx'
import { commerceMessage, translateProduct } from '../../commerce/messages.js'
import { trackEvent } from '../../commerce/pageAnalytics.js'
import { isExternalUrl } from '../../utils/links.js'
import { siteContent } from '../../data/siteContent.js'
import { media } from '../../data/media.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import Reveal from '../../components/Reveal.jsx'
import TransitionImage from '../../components/TransitionImage.jsx'
import Link from '../../components/Link.jsx'

const TSHIRT_FLIP_MS = 3400
const HOVER_RESUME_MS = 2000
const MANUAL_VIEW_RESUME_MS = 5000

function finePointerHover() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

function Shop() {
  const [views, setViews] = useState({})
  const [autoViews, setAutoViews] = useState({})
  const [manualLock, setManualLock] = useState({})
  const [hoverPaused, setHoverPaused] = useState({})
  const [selectedSizes, setSelectedSizes] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [zoom, setZoom] = useState(null)
  const [autoPromos, setAutoPromos] = useState(DEFAULT_AUTO_PROMOS)
  const autoTimers = useRef({})
  const manualTimers = useRef({})
  const hoverTimers = useRef({})
  const manualHoverBypass = useRef({})
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

  function clearAutoTimer(id) {
    if (autoTimers.current[id]) {
      window.clearInterval(autoTimers.current[id])
      autoTimers.current[id] = null
    }
  }

  function clearManualTimer(id) {
    if (manualTimers.current[id]) {
      window.clearTimeout(manualTimers.current[id])
      manualTimers.current[id] = null
    }
  }

  function clearHoverTimer(id) {
    if (hoverTimers.current[id]) {
      window.clearTimeout(hoverTimers.current[id])
      hoverTimers.current[id] = null
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

  function clearHoverPause(id) {
    setHoverPaused((current) => {
      if (!current[id]) return current
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function toggleAutoView(product) {
    setAutoViews((current) => {
      const active = resolveProductView(product, current[product.id] ?? product.defaultView)
      const next = active === 'front' ? 'back' : 'front'
      return { ...current, [product.id]: resolveProductView(product, next) }
    })
  }

  function restartAutoInterval(product) {
    clearAutoTimer(product.id)
    if (!isTshirt(product) || reducedMotion || !product.front || !product.back) return
    autoTimers.current[product.id] = window.setInterval(() => {
      toggleAutoView(product)
    }, TSHIRT_FLIP_MS)
  }

  function pauseAutoOnHover(product) {
    if (!isTshirt(product) || reducedMotion || !finePointerHover()) return
    if (manualTimers.current[product.id] || manualHoverBypass.current[product.id]) return
    clearAutoTimer(product.id)
    clearHoverTimer(product.id)
    setHoverPaused((current) => (current[product.id] ? current : { ...current, [product.id]: true }))
  }

  function scheduleAutoResume(product) {
    if (!isTshirt(product) || reducedMotion || !finePointerHover()) return
    manualHoverBypass.current[product.id] = false
    if (manualTimers.current[product.id]) return
    clearHoverTimer(product.id)
    hoverTimers.current[product.id] = window.setTimeout(() => {
      clearHoverPause(product.id)
      restartAutoInterval(product)
      hoverTimers.current[product.id] = null
    }, HOVER_RESUME_MS)
  }

  function setProductView(product, next) {
    if (next === 'front' && !product.front) return
    if (next === 'back' && !product.back) return

    setViews((current) => ({ ...current, [product.id]: next }))
    setManualLock((current) => ({ ...current, [product.id]: true }))
    clearAutoTimer(product.id)
    clearManualTimer(product.id)
    clearHoverTimer(product.id)
    clearHoverPause(product.id)
    manualHoverBypass.current[product.id] = true

    if (isTshirt(product) && !reducedMotion && product.front && product.back) {
      manualTimers.current[product.id] = window.setTimeout(() => {
        const resumedView = next === 'front' ? 'back' : 'front'
        setAutoViews((current) => ({ ...current, [product.id]: resumedView }))
        unlockManual(product.id)
        manualTimers.current[product.id] = null
        restartAutoInterval(product)
      }, MANUAL_VIEW_RESUME_MS)
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
    return resolveProductView(product, autoViews[product.id] ?? ((index % 2 === 0) ? 'front' : 'back'))
  }

  function sizesFor(product) {
    return (product.variants ?? []).map((variant) => variant.size)
  }

  function sizeLabel(product, size) {
    const variant = (product.variants ?? []).find((row) => row.size === size)
    if (variant?.label) return variant.label
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
        variantLabel: sizeLabel(product, size),
        singleVariant: sizes.length === 1,
        price: formatEuros(product.sale.priceCents, intlLocale),
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
    Object.values(autoTimers.current).forEach((timer) => {
      if (timer) window.clearInterval(timer)
    })
    autoTimers.current = {}

    if (reducedMotion) return undefined

    items.forEach((product, index) => {
      if (!isTshirt(product) || !product.front || !product.back) return
      if (manualTimers.current[product.id] || hoverTimers.current[product.id]) return
      autoTimers.current[product.id] = window.setInterval(() => {
        setAutoViews((current) => {
          const initialView = index % 2 === 0 ? 'front' : 'back'
          const active = resolveProductView(product, current[product.id] ?? initialView)
          const next = active === 'front' ? 'back' : 'front'
          return { ...current, [product.id]: resolveProductView(product, next) }
        })
      }, TSHIRT_FLIP_MS)
    })

    return () => {
      Object.values(autoTimers.current).forEach((timer) => {
        if (timer) window.clearInterval(timer)
      })
      autoTimers.current = {}
    }
  }, [items, reducedMotion])

  useEffect(() => () => {
    Object.values(autoTimers.current).forEach((timer) => {
      if (timer) window.clearInterval(timer)
    })
    Object.values(manualTimers.current).forEach((timer) => {
      if (timer) window.clearTimeout(timer)
    })
    Object.values(hoverTimers.current).forEach((timer) => {
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
    <section
      id="shop"
      className="shop-section section-shell"
      aria-labelledby="shop-title"
      style={{ '--shop-atmosphere-image': `url("${media.hero.src}")` }}
    >
      <Reveal as="header" className="shop-heading">
        <div className="shop-heading-main">
          <h2 id="shop-title" className="editorial-title">{t('shop.title')}</h2>
        </div>
        <div className="shop-heading-meta">
          <p className="eyebrow shop-collection">
            <span>{t('shop.label')}</span>
            <span className="small-separator" aria-hidden="true">/</span>
            <span>{t('music.albumTitle')}</span>
          </p>
        </div>
        {purchasable && autoPromos.length > 0 ? (
          <ul className="shop-promo">
            {autoPromos.map((promo) => (
              <li key={promo.id}>
                {t(promo.shopMessageKey, { amount: formatEuros(promo.amountOffCents, intlLocale) })}
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
          const uniqueOnly = sizes.length === 1
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
          return <Reveal key={product.id} as="article" className={productClassName} delay={(index % 2) * 0.08}
            distance={18}
            duration={1.05}
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
              {labels.color ? <span className="product-detail-copy">{labels.color}</span> : null}
              {sale ? <span className="product-detail-price">{formatEuros(sale.priceCents, intlLocale)}</span> : product.price !== null && <span className="product-detail-price">{new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR' }).format(product.price)}</span>}
            </div>
            {sale && (
              <div className="product-buy">
                {hasAnyStock ? (
                  <>
                    {uniqueOnly ? (
                      <p className="size-unique-note product-cd-note">{product.typeKey === 'cd' ? t('shop.cdSignedNote') : sizeLabel(product, sizes[0])}</p>
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
                              {sizeLabel(product, size)}
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
            <small>{feedback.singleVariant ? feedback.variantLabel : t('shop.addedSize', { size: feedback.variantLabel })} · {feedback.price}</small>
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
