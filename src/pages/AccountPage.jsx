import { useEffect, useState } from 'react'
import { useAuth } from '../commerce/AuthProvider.jsx'
import { supabase } from '../commerce/supabase.js'
import { commerceConfigured } from '../commerce/config.js'
import { formatEuros, isValidEmail } from '../commerce/cartRules.js'
import { commerceMessage } from '../commerce/messages.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import Link from '../components/Link.jsx'

function AccountPage() {
  const { ready, user, signIn, signOut } = useAuth()
  const { t, intlLocale } = useI18n()
  const [email, setEmail] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (!supabase || !user) return undefined
    let active = true
    supabase
      .from('orders')
      .select('id, paid_at, total_cents, promo_code, order_items (product_id, size, quantity, unit_price_cents)')
      .order('paid_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return
        if (loadError) setError(commerceMessage('request_failed', t))
        else setOrders(data ?? [])
      })
    return () => { active = false }
  }, [user, t])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!isValidEmail(email)) {
      setError(commerceMessage('invalid_email', t))
      return
    }
    try {
      await signIn(email.trim())
      setNotice(commerceMessage('magic_sent', t))
    } catch {
      setError(commerceMessage('request_failed', t))
    }
  }

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell account-shell">
        <p className="eyebrow section-kicker">{t('account.kicker')}</p>
        <h1 className="editorial-title page-title">{t('account.title')}</h1>
        {!commerceConfigured && <p className="availability-note">{t('account.disabled')}</p>}
        {commerceConfigured && ready && !user && (
          <form className="account-form" onSubmit={submit}>
            <p>{t('account.magicIntro')}</p>
            <label className="field">
              <span>{t('account.email')}</span>
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {notice && <p className="field-ok" role="status">{notice}</p>}
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="commerce-button">{t('account.sendLink')}</button>
          </form>
        )}
        {user && (
          <div className="account-session">
            <p className="account-email">{user.email}</p>
            <button type="button" className="text-link" onClick={signOut}>{t('account.signOut')} <span aria-hidden="true">↗</span></button>
            <h2 className="account-orders-title">{t('account.ordersTitle')}</h2>
            {orders.length === 0 ? <p className="availability-note">{t('account.noOrders')}</p> : (
              <ul className="order-list">
                {orders.map((order) => (
                  <li key={order.id}>
                    <p className="eyebrow">{order.paid_at ? new Date(order.paid_at).toLocaleDateString(intlLocale) : t('account.paidFallback')}</p>
                    <p>{formatEuros(order.total_cents)}</p>
                    <ul>
                      {(order.order_items ?? []).map((item) => (
                        <li key={`${item.product_id}-${item.size}`}>{item.quantity} × {item.product_id} · {item.size}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className="field-error" role="alert">{error}</p>}
          </div>
        )}
        <p className="page-back"><Link href="/#shop" className="text-link">{t('account.backToCollection')} <span aria-hidden="true">↗</span></Link></p>
      </div>
    </main>
  )
}

export default AccountPage
