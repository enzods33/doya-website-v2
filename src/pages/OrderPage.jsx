import { useEffect, useRef, useState } from 'react'
import { fetchOrder } from '../commerce/checkout.js'
import { formatEuros } from '../commerce/cartRules.js'
import { commerceMessage } from '../commerce/messages.js'
import { useCart } from '../commerce/CartProvider.jsx'
import Link from '../components/Link.jsx'

function OrderPage() {
  const { clear } = useCart()
  const clearCart = useRef(clear)
  clearCart.current = clear
  const sessionId = new URLSearchParams(window.location.search).get('session_id') ?? ''
  const [state, setState] = useState({ loading: true, order: null, error: '' })

  useEffect(() => {
    let active = true
    fetchOrder(sessionId)
      .then((order) => {
        if (!active) return
        if (order.paid) clearCart.current()
        setState({ loading: false, order, error: '' })
      })
      .catch((caught) => {
        if (!active) return
        setState({ loading: false, order: null, error: commerceMessage(caught.message) })
      })
    return () => { active = false }
  }, [sessionId])

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell account-shell">
        <p className="eyebrow section-kicker">Boutique</p>
        <h1 className="editorial-title page-title">Commande</h1>
        {state.loading && <p>Vérification du paiement…</p>}
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        {state.order?.paid && (
          <div>
            <p className="live-empty-title">Merci.</p>
            <p className="availability-note">Un reçu Stripe part à {state.order.email}. Le stock a été débité uniquement après confirmation du paiement.</p>
            <p className="cart-total"><span>Total</span><strong>{formatEuros(state.order.totalCents)}</strong></p>
            <ul className="order-list">
              {(state.order.items ?? []).map((item) => (
                <li key={`${item.product_id}-${item.size}`}>{item.quantity} × {item.product_id} · {item.size}</li>
              ))}
            </ul>
          </div>
        )}
        {state.order && !state.order.paid && <p>Le paiement n’est pas encore confirmé.</p>}
        <p className="page-back"><Link href="/#shop" className="text-link">Retour à la collection <span aria-hidden="true">↗</span></Link></p>
      </div>
    </main>
  )
}

export default OrderPage
