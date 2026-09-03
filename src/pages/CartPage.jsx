import { useMemo, useState } from 'react'
import { useAuth } from '../commerce/AuthProvider.jsx'
import { useCart } from '../commerce/CartProvider.jsx'
import { useCatalog } from '../commerce/CatalogProvider.jsx'
import { startCheckout } from '../commerce/checkout.js'
import { formatEuros, isValidEmail, normalizePromoCode } from '../commerce/cartRules.js'
import { commerceConfigured } from '../commerce/config.js'
import { commerceMessage } from '../commerce/messages.js'
import { availableFor } from '../commerce/catalog.js'
import Link from '../components/Link.jsx'
import { shopContent } from '../data/products.js'

function CartPage() {
  const { user } = useAuth()
  const { items, setQuantity, removeItem } = useCart()
  const { items: catalog } = useCatalog()
  const [email, setEmail] = useState(user?.email ?? '')
  const [promoCode, setPromoCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(new URLSearchParams(window.location.search).get('canceled') ? commerceMessage('canceled') : '')

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
  const canPay = commerceConfigured && lines.length > 0 && lines.every((line) => line.product?.sale && line.available >= line.quantity)

  async function pay(event) {
    event.preventDefault()
    setError('')
    if (!user && !isValidEmail(email)) {
      setError(commerceMessage('invalid_email'))
      return
    }
    setBusy(true)
    try {
      const { url } = await startCheckout({
        items: lines.map(({ productId, size, quantity }) => ({ productId, size, quantity })),
        email: user?.email ?? email,
        promoCode: normalizePromoCode(promoCode) || undefined,
      })
      if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('stripe_unavailable')
      window.location.assign(url)
    } catch (caught) {
      setError(commerceMessage(caught.message))
      setBusy(false)
    }
  }

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell">
        <p className="eyebrow section-kicker">Boutique</p>
        <h1 className="editorial-title page-title">Panier</h1>
        {!commerceConfigured && <p className="availability-note">{shopContent.note}</p>}
        {lines.length === 0 ? (
          <p className="page-empty">Le panier est vide. <Link href="/#shop" className="text-link">Voir la collection <span aria-hidden="true">↗</span></Link></p>
        ) : (
          <form className="cart-form" onSubmit={pay}>
            <ul className="cart-list">
              {lines.map((line) => (
                <li key={`${line.productId}-${line.size}`} className="cart-line">
                  <img src={line.product?.front} alt="" width={line.product?.width} height={line.product?.height} />
                  <div>
                    <p className="eyebrow">{line.product?.type}</p>
                    <h2>{line.product?.name ?? line.productId}</h2>
                    <p className="cart-meta">Noir · taille {line.size}{line.priceCents ? ` · ${formatEuros(line.priceCents)}` : ''}</p>
                    <div className="cart-actions">
                      <label>
                        <span className="visually-hidden">Quantité</span>
                        <input type="number" min="1" max="5" value={line.quantity} disabled={busy}
                          onChange={(event) => setQuantity(line.productId, line.size, Number(event.target.value), line.available)} />
                      </label>
                      <button type="button" onClick={() => removeItem(line.productId, line.size)}>Retirer</button>
                    </div>
                    {line.available < line.quantity && <p className="field-error">{commerceMessage('out_of_stock')}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-aside">
              {!user && (
                <label className="field">
                  <span>E-mail de confirmation</span>
                  <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                </label>
              )}
              <label className="field">
                <span>Code promo</span>
                <input type="text" autoComplete="off" spellCheck="false" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="Vérifié au paiement" />
              </label>
              <p className="cart-total"><span>Sous-total estimé</span><strong>{formatEuros(subtotal) ?? '—'}</strong></p>
              <p className="availability-note">Le total définitif, la promo et la livraison sont confirmés par Stripe. Aucune carte n’est saisie sur ce site.</p>
              {error && <p className="field-error" role="alert">{error}</p>}
              <button type="submit" className="commerce-button" disabled={busy || !canPay}>{busy ? 'Redirection…' : 'Payer avec Stripe'}</button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}

export default CartPage
