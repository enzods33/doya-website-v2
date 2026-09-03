import { useEffect, useRef, useState } from 'react'
import { fetchOrder } from '../commerce/checkout.js'
import { formatEuros } from '../commerce/cartRules.js'
import { commerceMessage } from '../commerce/messages.js'
import { useCart } from '../commerce/CartProvider.jsx'
import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'

function OrderPage() {
  const { clear } = useCart()
  const { t } = useI18n()
  const clearCart = useRef(clear)
  const sessionId = new URLSearchParams(window.location.search).get('session_id') ?? ''
  const [state, setState] = useState({ loading: true, order: null, error: '' })

  useEffect(() => {
    clearCart.current = clear
  }, [clear])

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
        setState({ loading: false, order: null, error: commerceMessage(caught.message, t) })
      })
    return () => { active = false }
  }, [sessionId, t])

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell account-shell">
        <p className="eyebrow section-kicker">{t('order.kicker')}</p>
        <h1 className="editorial-title page-title">{t('order.title')}</h1>
        {state.loading && <p>{t('order.verifying')}</p>}
        {state.error && <p className="field-error" role="alert">{state.error}</p>}
        {state.order?.paid && (
          <div>
            <p className="live-empty-title">{t('order.thanks')}</p>
            <p className="availability-note">{t('order.receiptNote', { email: state.order.email })}</p>
            <p className="cart-total"><span>{t('order.total')}</span><strong>{formatEuros(state.order.totalCents)}</strong></p>
            <ul className="order-list">
              {(state.order.items ?? []).map((item) => (
                <li key={`${item.product_id}-${item.size}`}>{item.quantity} × {item.product_id} · {item.size}</li>
              ))}
            </ul>
          </div>
        )}
        {state.order && !state.order.paid && <p>{t('order.unpaid')}</p>}
        <p className="page-back"><Link href="/#shop" className="text-link">{t('order.backToCollection')} <span aria-hidden="true">↗</span></Link></p>
      </div>
    </main>
  )
}

export default OrderPage
