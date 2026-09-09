import { useEffect, useId, useMemo, useState } from 'react'
import { useCart } from '../commerce/CartProvider.jsx'
import { useCatalog } from '../commerce/CatalogProvider.jsx'
import { startCheckout } from '../commerce/checkout.js'
import { subscribeNewsletter } from '../commerce/newsletter.js'
import { requestShippingQuote } from '../commerce/shippingQuote.js'
import { CART_LIMITS, FLAT_SHIPPING_LIMITS, bestAutoPromo, formatEuros, isValidEmail, normalizePromoCode } from '../commerce/cartRules.js'
import { commerceConfigured } from '../commerce/config.js'
import { trackEvent } from '../commerce/pageAnalytics.js'
import { commerceMessage, translateProduct } from '../commerce/messages.js'
import { availableFor } from '../commerce/catalog.js'
import { SHIPPING_ZONES, zoneForCountry } from '../commerce/shippingZones.js'
import { shippingQuoteEmails } from '../data/contacts.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'
import { Stars } from '../components/Brand.jsx'

function CartPage() {
  const { items, setQuantity, removeItem } = useCart()
  const { items: catalog } = useCatalog()
  const { locale, t } = useI18n()
  const zoomTitleId = useId()
  const [email, setEmail] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [acceptCgv, setAcceptCgv] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [shippingCountry, setShippingCountry] = useState('FR')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [quoteSent, setQuoteSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [zoom, setZoom] = useState(null)
  const [emailTouched, setEmailTouched] = useState(false)
  const [cgvError, setCgvError] = useState(false)
  const [error, setError] = useState(() => (new URLSearchParams(window.location.search).get('canceled') ? commerceMessage('canceled', t) : ''))

  useEffect(() => {
    setQuoteSent(false)
  }, [items])

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

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: 'region' })
    } catch {
      return new Intl.DisplayNames(['fr'], { type: 'region' })
    }
  }, [locale])

  const lines = useMemo(() => items.map((item) => {
    const product = catalog.find((entry) => entry.id === item.productId)
    return {
      ...item,
      product,
      available: product ? availableFor(product, item.size) : 0,
      priceCents: product?.sale?.priceCents ?? null,
    }
  }), [items, catalog])

  const subtotal = lines.reduce((total, line) => total + (line.priceCents ?? 0) * line.quantity, 0)
  const teeQty = lines.reduce((total, line) => (
    line.product?.typeKey === 'tshirt' ? total + line.quantity : total
  ), 0)
  const cdQty = lines.reduce((total, line) => (
    line.product?.typeKey === 'cd' ? total + line.quantity : total
  ), 0)
  const needsShippingQuote = teeQty > FLAT_SHIPPING_LIMITS.maxTees || cdQty > FLAT_SHIPPING_LIMITS.maxCds
  const manualPromo = Boolean(normalizePromoCode(promoCode))
  const appliedPromo = manualPromo ? null : bestAutoPromo(teeQty, cdQty)
  const autoDiscountCents = appliedPromo?.amountOffCents ?? 0
  const shippingZone = zoneForCountry(shippingCountry)
  const shippingCents = shippingZone?.amountCents ?? 0
  const emailValid = isValidEmail(email)
  const emailError = emailTouched
    ? (!email.trim()
      ? commerceMessage('email_required', t)
      : (!emailValid ? commerceMessage('invalid_email', t) : ''))
    : ''
  const canPay = commerceConfigured
    && !needsShippingQuote
    && lines.length > 0
    && lines.every((line) => line.product?.sale && line.available >= line.quantity)
  const canRequestQuote = lines.length > 0 && !quoteSent

  const quoteMailto = useMemo(() => {
    const subject = t('cart.quoteSubject')
    const body = t('cart.quoteBody', {
      tees: String(teeQty),
      cds: String(cdQty),
      email: email.trim() || '—',
      message: quoteMessage.trim() || '—',
      country: shippingCountry,
    })
    return `mailto:${shippingQuoteEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [cdQty, email, quoteMessage, shippingCountry, t, teeQty])

  function openMailtoFallback() {
    window.location.assign(quoteMailto)
  }

  async function submitCart(event) {
    event.preventDefault()
    setError('')
    if (!isValidEmail(email)) {
      setEmailTouched(true)
      setError(commerceMessage(email.trim() ? 'invalid_email' : 'email_required', t))
      document.getElementById('cart-email')?.focus()
      return
    }
    if (!shippingZone) {
      setError(commerceMessage('invalid_shipping_country', t))
      return
    }

    if (needsShippingQuote) {
      if (quoteMessage.trim().length < 5) {
        setError(commerceMessage('invalid_message', t))
        document.getElementById('cart-quote-message')?.focus()
        return
      }
      setBusy(true)
      trackEvent('shipping_quote_request', 'cart')
      try {
        if (newsletter) {
          try {
            await subscribeNewsletter(email.trim(), locale)
          } catch {
            // Ne bloque pas le devis si Brevo newsletter échoue.
          }
        }
        if (!commerceConfigured) {
          openMailtoFallback()
          setQuoteSent(true)
          setBusy(false)
          return
        }
        await requestShippingQuote({
          email: email.trim(),
          message: quoteMessage.trim(),
          shippingCountry,
          locale,
          items: lines.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
        })
        setQuoteSent(true)
        setError('')
      } catch (caught) {
        if (caught.message === 'commerce_disabled' || caught.status === 502) {
          openMailtoFallback()
          setQuoteSent(true)
        } else {
          setError(commerceMessage(caught.message, t))
        }
      } finally {
        setBusy(false)
      }
      return
    }

    if (!acceptCgv) {
      setCgvError(true)
      setError(t('cart.acceptCgvRequired'))
      document.getElementById('cart-accept-cgv')?.focus()
      return
    }
    setCgvError(false)

    setBusy(true)
    trackEvent('checkout_start', 'cart')
    try {
      if (newsletter) {
        try {
          await subscribeNewsletter(email.trim(), locale)
        } catch {
          // Ne bloque pas le paiement si Brevo échoue.
        }
      }
      const { url } = await startCheckout({
        items: lines.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
        email: email.trim(),
        promoCode: normalizePromoCode(promoCode) || undefined,
        shippingCountry,
        locale,
      })
      if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('stripe_unavailable')
      window.location.assign(url)
    } catch (caught) {
      setError(commerceMessage(caught.message, t))
      setBusy(false)
    }
  }

  return (
    <main id="main" className="page-main cart-page" tabIndex={-1}>
      <div className="page-shell cart-shell">
        <header className="cart-header">
          <p className="eyebrow section-kicker">{t('cart.kicker')}</p>
          <div className="cart-header-row">
            <h1 className="editorial-title page-title cart-title">{t('cart.title')}</h1>
            <Link href="/#shop" className="text-link cart-back-shop">
              {t('cart.backToShop')} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </header>
        {!commerceConfigured && <p className="availability-note">{t('shop.note')}</p>}
        {lines.length === 0 ? (
          <div className="cart-empty">
            <Stars color="black" className="cart-empty-stars" />
            <div className="cart-empty-copy">
              <p className="cart-empty-status">{t('cart.empty')}</p>
              <p className="cart-empty-hint">{t('cart.emptyHint')}</p>
            </div>
            <div className="cart-empty-actions">
              <Link href="/#shop" className="commerce-button cart-empty-primary">
                {t('cart.seeCollection')}
              </Link>
              <Link href="/" className="text-link cart-empty-secondary">
                {t('cart.backHome')} <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        ) : (
          <form className="cart-form" onSubmit={submitCart}>
            <ul className="cart-list">
              {lines.map((line) => {
                const labels = translateProduct(t, line.product)
                const src = line.product?.front
                const alt = line.product
                  ? t('shop.productAlt', {
                    type: labels.type,
                    name: labels.name,
                    color: (labels.color || '').toLowerCase(),
                    view: t('shop.viewFrontWord'),
                  })
                  : ''
                return (
                  <li key={`${line.productId}-${line.size}`} className="cart-line">
                    <div className="cart-line-media">
                      <button
                        type="button"
                        className="product-image-trigger cart-line-zoom"
                        disabled={!line.product || !src}
                        onClick={() => line.product && setZoom({ product: line.product, view: 'front' })}
                        aria-label={line.product ? `${t('shop.zoom')} — ${alt}` : undefined}
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={alt}
                            width={line.product.width}
                            height={line.product.height}
                            className="cart-line-image"
                          />
                        ) : null}
                      </button>
                    </div>
                    <div>
                      <p className="eyebrow">{labels.type}</p>
                      <h2>{labels.name || line.productId}</h2>
                      <p className="cart-meta">
                        {line.size === 'U'
                          ? t('cart.lineMetaUnique', { color: labels.color || '—' })
                          : t('cart.lineMeta', { color: labels.color || '—', size: line.size })}
                        {line.priceCents ? ` · ${formatEuros(line.priceCents)}` : ''}
                      </p>
                      <div className="cart-actions">
                        <div className="cart-qty" role="group" aria-label={t('cart.quantity')}>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            aria-label={t('cart.qtyDecrease')}
                            disabled={busy || line.quantity <= 1}
                            onClick={() => setQuantity(line.productId, line.size, line.quantity - 1, line.available)}
                          >
                            −
                          </button>
                          <span className="cart-qty-value" aria-live="polite">{line.quantity}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            aria-label={t('cart.qtyIncrease')}
                            disabled={
                              busy
                              || line.quantity >= CART_LIMITS.maxLineQuantity
                              || (Number.isInteger(line.available) && line.quantity >= line.available)
                            }
                            onClick={() => setQuantity(line.productId, line.size, line.quantity + 1, line.available)}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="cart-remove"
                          aria-label={t('cart.remove')}
                          disabled={busy}
                          onClick={() => removeItem(line.productId, line.size)}
                        >
                          {t('cart.remove')}
                        </button>
                      </div>
                      {line.available < line.quantity && <p className="field-error">{commerceMessage('out_of_stock', t)}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="cart-aside">
              <p className="eyebrow cart-aside-kicker">{t('cart.summary')}</p>

              <div className="cart-aside-fields">
                <label className="field cart-field">
                  <span>{t('cart.email')}</span>
                  <input
                    id="cart-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck="false"
                    value={email}
                    disabled={busy || quoteSent}
                    placeholder={t('newsletter.placeholder')}
                    aria-invalid={emailError ? true : undefined}
                    aria-describedby={emailError ? 'cart-email-error' : undefined}
                    onBlur={() => setEmailTouched(true)}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError((current) => (
                        current === commerceMessage('invalid_email', t) || current === commerceMessage('email_required', t)
                          ? ''
                          : current
                      ))
                    }}
                  />
                  {emailError ? (
                    <p id="cart-email-error" className="field-error" role="alert">{emailError}</p>
                  ) : null}
                </label>

                <label className="cart-check">
                  <input
                    type="checkbox"
                    checked={newsletter}
                    disabled={busy || quoteSent}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setNewsletter(checked)
                      if (checked) trackEvent('newsletter_optin', 'cart')
                    }}
                  />
                  <span>{t('cart.newsletter')}</span>
                </label>

                {!needsShippingQuote ? (
                  <div className={`cart-check-wrap${cgvError ? ' is-invalid' : ''}`}>
                    <label className="cart-check" htmlFor="cart-accept-cgv">
                      <input
                        id="cart-accept-cgv"
                        type="checkbox"
                        checked={acceptCgv}
                        disabled={busy}
                        aria-invalid={cgvError ? true : undefined}
                        aria-describedby={cgvError ? 'cart-cgv-error' : undefined}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setAcceptCgv(checked)
                          if (checked) {
                            setCgvError(false)
                            setError((current) => (current === t('cart.acceptCgvRequired') ? '' : current))
                          }
                        }}
                      />
                      <span>
                        {t('cart.acceptCgv')}{' '}
                        <Link href="/cgv" className="text-link">{t('cart.acceptCgvLink')}</Link>
                      </span>
                    </label>
                    {cgvError ? (
                      <p id="cart-cgv-error" className="field-error" role="alert">{t('cart.acceptCgvRequired')}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="cart-aside-row">
                  <label className="field cart-field">
                    <span>{t('cart.promo')}</span>
                    <input type="text" autoComplete="off" spellCheck="false" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder={t('cart.promoPlaceholder')} />
                  </label>
                  <label className="field cart-field">
                    <span>{t('cart.shippingCountry')}</span>
                    <select
                      required
                      value={shippingCountry}
                      disabled={busy || quoteSent}
                      onChange={(event) => setShippingCountry(event.target.value)}
                    >
                      {SHIPPING_ZONES.map((zone) => (
                        <optgroup key={zone.id} label={t(`cart.zone.${zone.id}`)}>
                          {zone.countries.map((code) => (
                            <option key={code} value={code}>
                              {regionNames.of(code) ?? code}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>

                {appliedPromo ? (
                  <p className="cart-promo-msg" role="status">
                    <strong>{t(appliedPromo.messageKey)}</strong>
                  </p>
                ) : null}
              </div>

              <div className="cart-aside-totals">
                <p className="cart-total">
                  <span>{t('cart.subtotal')}</span>
                  <strong>{formatEuros(subtotal - autoDiscountCents) ?? '—'}</strong>
                </p>
                <p className="cart-total cart-shipping">
                  <span>{t('cart.shippingLabel')}</span>
                  <strong>{needsShippingQuote ? t('cart.shippingQuote') : formatEuros(shippingCents)}</strong>
                </p>
                {!needsShippingQuote ? (
                  <p className="cart-total cart-grand">
                    <span>{t('cart.totalDue')}</span>
                    <strong>{formatEuros(subtotal - autoDiscountCents + shippingCents) ?? '—'}</strong>
                  </p>
                ) : null}
              </div>

              {needsShippingQuote ? (
                <>
                  <p className="availability-note cart-quote-note" role="status">{t('cart.quoteNote')}</p>
                  {quoteSent ? (
                    <p className="cart-quote-success" role="status">{t('cart.quoteSuccess')}</p>
                  ) : (
                    <label className="field cart-field cart-quote-field">
                      <span>{t('cart.quoteMessage')}</span>
                      <textarea
                        id="cart-quote-message"
                        rows={4}
                        maxLength={2000}
                        value={quoteMessage}
                        disabled={busy}
                        placeholder={t('cart.quoteMessagePlaceholder')}
                        onChange={(event) => {
                          setQuoteMessage(event.target.value)
                          setError((current) => (
                            current === commerceMessage('invalid_message', t) ? '' : current
                          ))
                        }}
                      />
                    </label>
                  )}
                </>
              ) : null}

              {error && !emailError && !cgvError ? (
                <p className="field-error" role="alert">{error}</p>
              ) : null}

              <div className="cart-aside-pay">
                {needsShippingQuote ? (
                  <>
                    <button
                      type="submit"
                      className="commerce-button cart-pay-button"
                      disabled={busy || !canRequestQuote}
                    >
                      {busy ? t('cart.quoteSending') : t('cart.quoteCta')}
                    </button>
                    {!quoteSent ? (
                      <p className="cart-pay-note">{t('cart.quoteAside')}</p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <button type="submit" className="commerce-button cart-pay-button" disabled={busy || !canPay}>
                      {busy ? t('cart.redirecting') : t('cart.pay')}
                    </button>
                    <p className="cart-pay-note">{t('cart.stripeAside')}</p>
                  </>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {zoom ? (() => {
        const labels = translateProduct(t, zoom.product)
        const src = zoom.product[zoom.view] || zoom.product.front
        return (
          <div className="product-zoom" role="dialog" aria-modal="true" aria-labelledby={zoomTitleId}>
            <button type="button" className="product-zoom-backdrop" aria-label={t('shop.zoomClose')} onClick={() => setZoom(null)} />
            <div className="product-zoom-panel">
              <div className="product-zoom-top">
                <p id={zoomTitleId} className="product-zoom-title">{labels.name} · {labels.color}</p>
                <button type="button" className="product-zoom-close" onClick={() => setZoom(null)}>
                  {t('shop.zoomClose')} <span aria-hidden="true">×</span>
                </button>
              </div>
              <img
                src={src}
                alt={t('shop.productAlt', {
                  type: labels.type,
                  name: labels.name,
                  color: (labels.color || '').toLowerCase(),
                  view: zoom.view === 'front' ? t('shop.viewFrontWord') : t('shop.viewBackWord'),
                })}
                width={zoom.product.width}
                height={zoom.product.height}
              />
              <div className="product-view-controls product-zoom-controls" role="group" aria-label={t('shop.viewGroup')}>
                <button
                  type="button"
                  aria-pressed={zoom.view === 'front'}
                  onClick={() => setZoom((current) => ({ ...current, view: 'front' }))}
                >
                  {t('shop.viewFront')}
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  aria-pressed={zoom.view === 'back'}
                  onClick={() => setZoom((current) => ({ ...current, view: 'back' }))}
                >
                  {t('shop.viewBack')}
                </button>
              </div>
            </div>
          </div>
        )
      })() : null}
    </main>
  )
}

export default CartPage
