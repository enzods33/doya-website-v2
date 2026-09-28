import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { serviceClient, stripeClient } from '../_shared/clients.ts'
import { allowRatePersistent, clientIp } from '../_shared/rateLimit.ts'
import { checkoutReleaseAction } from '../_shared/checkoutRelease.ts'

/** Libère le stock si le client annule Stripe Checkout (retour /panier?canceled=1&session_id=…). */

const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_IP = 20

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = serviceClient()
  if (!(await allowRatePersistent(admin, `release-checkout:ip:${clientIp(req)}`, MAX_PER_IP, WINDOW_MS))) {
    return json(429, { error: 'rate_limited' }, origin)
  }

  let sessionId = ''
  try {
    const body = await req.json()
    sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return json(400, { error: 'invalid_session' }, origin)
  }

  try {
    const session = await stripeClient().checkout.sessions.retrieve(sessionId)
    if (!session?.id) return json(404, { error: 'not_found' }, origin)

    // Une session non payée peut encore être ouverte et payable depuis un autre onglet.
    // Expirer Stripe avant de libérer la réservation ferme cette fenêtre de concurrence.
    const action = checkoutReleaseAction(session.status)
    if (action === 'expire') {
      try {
        await stripeClient().checkout.sessions.expire(sessionId)
      } catch (error) {
        console.error('checkout_expire_failed', error)
        return json(409, { error: 'checkout_still_open' }, origin)
      }
    } else if (action === 'wait') {
      // Une session terminée peut encore attendre la confirmation d'un paiement asynchrone.
      return json(200, { released: false, reason: 'checkout_complete' }, origin)
    }

    const orderId = typeof session.metadata?.orderId === 'string' ? session.metadata.orderId : ''
    if (!orderId) return json(404, { error: 'not_found' }, origin)

    const { error } = await admin.rpc('release_reservation', { p_order_id: orderId })
    if (error) throw error

    return json(200, { released: true }, origin)
  } catch (error) {
    console.error(error)
    return json(502, { error: 'release_failed' }, origin)
  }
})
