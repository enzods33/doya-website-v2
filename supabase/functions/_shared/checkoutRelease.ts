/** Libérer une réservation seulement lorsque Stripe ne peut plus encaisser. */
export function checkoutReleaseAction(status: string | null): 'expire' | 'release' | 'wait' {
  if (status === 'open') return 'expire'
  if (status === 'expired') return 'release'
  return 'wait'
}
