import { useEffect, useState } from 'react'
import { useAuth } from '../commerce/AuthProvider.jsx'
import { supabase } from '../commerce/supabase.js'
import { commerceConfigured } from '../commerce/config.js'
import { formatEuros, isValidEmail } from '../commerce/cartRules.js'
import { commerceMessage } from '../commerce/messages.js'
import Link from '../components/Link.jsx'

function AccountPage() {
  const { ready, user, signIn, signOut } = useAuth()
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
        if (loadError) setError(commerceMessage('request_failed'))
        else setOrders(data ?? [])
      })
    return () => { active = false }
  }, [user])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!isValidEmail(email)) {
      setError(commerceMessage('invalid_email'))
      return
    }
    try {
      await signIn(email.trim())
      setNotice(commerceMessage('magic_sent'))
    } catch {
      setError(commerceMessage('request_failed'))
    }
  }

  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell account-shell">
        <p className="eyebrow section-kicker">Boutique</p>
        <h1 className="editorial-title page-title">Compte</h1>
        {!commerceConfigured && <p className="availability-note">La boutique n’est pas encore connectée.</p>}
        {commerceConfigured && ready && !user && (
          <form className="account-form" onSubmit={submit}>
            <p>Connexion par lien envoyé par e-mail. Aucun mot de passe n’est stocké ici.</p>
            <label className="field">
              <span>E-mail</span>
              <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            {notice && <p className="field-ok" role="status">{notice}</p>}
            {error && <p className="field-error" role="alert">{error}</p>}
            <button type="submit" className="commerce-button">Recevoir le lien</button>
          </form>
        )}
        {user && (
          <div className="account-session">
            <p className="account-email">{user.email}</p>
            <button type="button" className="text-link" onClick={signOut}>Se déconnecter <span aria-hidden="true">↗</span></button>
            <h2 className="account-orders-title">Commandes</h2>
            {orders.length === 0 ? <p className="availability-note">Aucune commande payée pour le moment.</p> : (
              <ul className="order-list">
                {orders.map((order) => (
                  <li key={order.id}>
                    <p className="eyebrow">{order.paid_at ? new Date(order.paid_at).toLocaleDateString('fr-FR') : 'Payée'}</p>
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
        <p className="page-back"><Link href="/#shop" className="text-link">Retour à la collection <span aria-hidden="true">↗</span></Link></p>
      </div>
    </main>
  )
}

export default AccountPage
