/** Miroir front des auto-promos serveur (montants chargés depuis catalog_auto_promos). */
export const DEFAULT_AUTO_PROMOS = [
  {
    id: '2tees',
    minTees: 2,
    minCds: 0,
    amountOffCents: 800,
    messageKey: 'cart.promoTees',
    shopMessageKey: 'shop.promoTees',
    labelKey: 'cart.autoDiscountTees',
  },
  {
    id: 'cdtee',
    minTees: 1,
    minCds: 1,
    amountOffCents: 500,
    messageKey: 'cart.promoCdTee',
    shopMessageKey: 'shop.promoCdTee',
    labelKey: 'cart.autoDiscountCdTee',
  },
]

export const AUTO_PROMOS = DEFAULT_AUTO_PROMOS

export function mapRemoteAutoPromos(rows) {
  if (!Array.isArray(rows) || !rows.length) return DEFAULT_AUTO_PROMOS
  const mapped = []
  for (const row of rows) {
    const amountOffCents = Number(row.amount_off_cents)
    const minTees = Number(row.min_tee_qty) || 0
    const minCds = Number(row.min_cd_qty) || 0
    if (!Number.isInteger(amountOffCents) || amountOffCents <= 0) continue
    if (minTees >= 2 && minCds <= 0) {
      mapped.push({
        id: '2tees',
        minTees: 2,
        minCds: 0,
        amountOffCents,
        messageKey: 'cart.promoTees',
        shopMessageKey: 'shop.promoTees',
        labelKey: 'cart.autoDiscountTees',
      })
    } else if (minTees >= 1 && minCds >= 1) {
      mapped.push({
        id: 'cdtee',
        minTees: 1,
        minCds: 1,
        amountOffCents,
        messageKey: 'cart.promoCdTee',
        shopMessageKey: 'shop.promoCdTee',
        labelKey: 'cart.autoDiscountCdTee',
      })
    }
  }
  return mapped.length ? mapped : DEFAULT_AUTO_PROMOS
}

export async function fetchAutoPromos() {
  try {
    const { supabase } = await import('./supabase.js')
    if (!supabase) return DEFAULT_AUTO_PROMOS
    const { data, error } = await supabase
      .from('catalog_auto_promos')
      .select('code, amount_off_cents, min_tee_qty, min_cd_qty')
    if (error || !data?.length) return DEFAULT_AUTO_PROMOS
    return mapRemoteAutoPromos(data)
  } catch {
    return DEFAULT_AUTO_PROMOS
  }
}

export function bestAutoPromo(teeQty, cdQty, promos = DEFAULT_AUTO_PROMOS) {
  const eligible = promos.filter((promo) => teeQty >= promo.minTees && cdQty >= promo.minCds)
  if (!eligible.length) return null
  return eligible.reduce((best, promo) => (promo.amountOffCents > best.amountOffCents ? promo : best))
}
