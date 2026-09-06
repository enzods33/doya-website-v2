import { useMemo, useState } from 'react'
import { useCart } from '../commerce/CartProvider.jsx'
import { useCatalog } from '../commerce/CatalogProvider.jsx'
import { startCheckout } from '../commerce/checkout.js'
import { CART_LIMITS, FLAT_SHIPPING_LIMITS, bestAutoPromo, formatEuros, isValidEmail, normalizePromoCode } from '../commerce/cartRules.js'
import { commerceConfigured } from '../commerce/config.js'
import { commerceMessage, translateProduct } from '../commerce/messages.js'
import { availableFor } from '../commerce/catalog.js'
import { SHIPPING_ZONES, zoneForCountry } from '../commerce/shippingZones.js'
import { shippingQuoteEmails } from '../data/contacts.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'

function CartPage() {
  const { items, setQuantity, removeItem } = useCart()
  const { items: catalog } = useCatalog()
  const { locale, t } = useI18n()
  const [email, setEmail] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [shippingCountry, setShippingCountry] = useState('FR')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(() => (new URLSearchParams(window.location.search).get('canceled') ? commerceMessage('canceled', t) : ''))

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
  const canPay = commerceConfigured
    && !needsShippingQuote
    && lines.length > 0
    && lines.every((line) => line.product?.sale && line.available >= line.quantity)

  const quoteMailto = useMemo(() => {
    const subject = t('cart.quoteSubject')
    const body = t('cart.quoteBody', {
      tees: String(teeQty),
      cds: String(cdQty),
      email: email.trim() || '—',
    })
    return `mailto:${shippingQuoteEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }, [cdQty, email, t, teeQty])

  async function pay(event) {
    event.preventDefault()
    setError('')
    if (needsShippingQuote) {
      setError(commerceMessage('shipping_quote_required', t))
      return
    }
    if (!isValidEmail(email)) {
      setError(commerceMessage('invalid_email', t))
      return
    }
    if (!shippingZone) {
      setError(commerceMessage('invalid_shipping_country', t))
      return
    }
    setBusy(true)
    try {
      const { url } = await startCheckout({
        items: lines.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
        email: email.trim(),
        promoCode: normalizePromoCode(promoCode) || undefined,
        shippingCountry,
      })
      if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('stripe_unavailable')
      window.location.assign(url)
    } catch (caught) {
      setError(commerceMessage(caught.message, t))
      setBusy(false)
    }
  }

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell">
        <p className="eyebrow section-kicker">{t('cart.kicker')}</p>
        <h1 className="editorial-title page-title">{t('cart.title')}</h1>
        {!commerceConfigured && <p className="availability-note">{t('shop.note')}</p>}
        {lines.length === 0 ? (
          <div className="page-empty">
            <p className="page-empty-text">{t('cart.empty')}</p>
            <div className="page-empty-links">
              <Link href="/" className="text-link">{t('cart.backHome')} <span aria-hidden="true">↗</span></Link>
              <Link href="/#shop" className="text-link">{t('cart.seeCollection')} <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        ) : (
          <form className="cart-form" onSubmit={pay}>
            <ul className="cart-list">
              {lines.map((line) => {
                const labels = translateProduct(t, line.product)
                return (
                  <li key={`${line.productId}-${line.size}`} className="cart-line">
                    <img src={line.product?.front} alt="" width={line.product?.width} height={line.product?.height} />
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
                        <label>
                          <span className="visually-hidden">{t('cart.quantity')}</span>
                          <input type="number" min="1" max={CART_LIMITS.maxLineQuantity} value={line.quantity} disabled={busy}
                            onChange={(event) => setQuantity(line.productId, line.size, Number(event.target.value), line.available)} />
                        </label>
                        <button type="button" onClick={() => removeItem(line.productId, line.size)}>{t('cart.remove')}</button>
                      </div>
                      {line.available < line.quantity && <p className="field-error">{commerceMessage('out_of_stock', t)}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="cart-aside">
              <label className="field">
                <span>{t('cart.email')}</span>
                <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="field">
                <span>{t('cart.promo')}</span>
                <input type="text" autoComplete="off" spellCheck="false" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder={t('cart.promoPlaceholder')} />
              </label>
              {appliedPromo ? (
                <p className="availability-note cart-promo-msg">
                  <strong>{t(appliedPromo.messageKey)}</strong>
                </p>
              ) : null}
              <label className="field">
                <span>{t('cart.shippingCountry')}</span>
                <select
                  required
                  value={shippingCountry}
                  disabled={busy || needsShippingQuote}
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
              <p className="cart-total"><span>{t('cart.subtotal')}</span><strong>{formatEuros(subtotal) ?? '—'}</strong></p>
              {autoDiscountCents > 0 && appliedPromo && (
                <p className="cart-total cart-discount">
                  <span>{t(appliedPromo.labelKey)}</span>
                  <strong>−{formatEuros(autoDiscountCents)}</strong>
                </p>
              )}
              <p className="cart-total cart-shipping">
                <span>{t('cart.shippingLabel')}</span>
                <strong>{needsShippingQuote ? t('cart.shippingQuote') : formatEuros(shippingCents)}</strong>
              </p>
              {needsShippingQuote ? (
                <p className="availability-note" role="status">
                  {t('cart.quoteNote')}{' '}
                  <a className="text-link" href={quoteMailto}>{t('cart.quoteCta')} <span aria-hidden="true">↗</span></a>
                </p>
              ) : (
                <p className="availability-note">{t('cart.stripeAside')}</p>
              )}
              {error && <p className="field-error" role="alert">{error}</p>}
              <button type="submit" className="commerce-button" disabled={busy || !canPay}>
                {busy ? t('cart.redirecting') : t('cart.pay')}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}

export default CartPage
