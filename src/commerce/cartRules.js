export const CART_LIMITS = {
  maxLineQuantity: 6,
  maxLines: 8,
  maxTotalQuantity: 12,
  /** U = unique (CD / articles sans taillage) */
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'U'],
  productIds: ['cd-luna-bohemia', 'luna-bohemia-white', 'luna-bohemia-black', 'doya-white', 'doya-black'],
}

/** Forfait port en ligne. Au-delà → devis (pas de Stripe). */
export const FLAT_SHIPPING_LIMITS = {
  maxTees: 6,
  maxCds: 5,
}

/** Miroir des auto-promos serveur : une seule s’applique (meilleure réduction). */
export const AUTO_PROMOS = [
  { id: '2tees', minTees: 2, minCds: 0, amountOffCents: 800, messageKey: 'cart.promoTees', labelKey: 'cart.autoDiscountTees' },
  { id: 'cdtee', minTees: 1, minCds: 1, amountOffCents: 500, messageKey: 'cart.promoCdTee', labelKey: 'cart.autoDiscountCdTee' },
]

export function eligibleAutoPromos(teeQty, cdQty) {
  return AUTO_PROMOS.filter((promo) => teeQty >= promo.minTees && cdQty >= promo.minCds)
}

export function bestAutoPromo(teeQty, cdQty) {
  const eligible = eligibleAutoPromos(teeQty, cdQty)
  if (!eligible.length) return null
  return eligible.reduce((best, promo) => (promo.amountOffCents > best.amountOffCents ? promo : best))
}

export function normalizePromoCode(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function validateCartItems(items) {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, error: 'empty_cart' }
  if (items.length > CART_LIMITS.maxLines) return { ok: false, error: 'too_many_lines' }

  const normalized = []
  let totalQuantity = 0
  const seen = new Set()

  for (const item of items) {
    const productId = typeof item?.productId === 'string' ? item.productId : ''
    const size = typeof item?.size === 'string' ? item.size.toUpperCase() : ''
    const quantity = Number(item?.quantity)
    const key = `${productId}:${size}`

    if (!CART_LIMITS.productIds.includes(productId) || !CART_LIMITS.sizes.includes(size)) {
      return { ok: false, error: 'invalid_cart' }
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > CART_LIMITS.maxLineQuantity) {
      return { ok: false, error: 'invalid_quantity' }
    }
    if (seen.has(key)) return { ok: false, error: 'duplicate_line' }
    seen.add(key)
    totalQuantity += quantity
    normalized.push({ productId, size, quantity })
  }

  if (totalQuantity > CART_LIMITS.maxTotalQuantity) return { ok: false, error: 'too_many_items' }
  return { ok: true, items: normalized }
}

export function mergeCartLine(items, productId, size, quantity = 1) {
  const next = items.map((item) => ({ ...item }))
  const index = next.findIndex((item) => item.productId === productId && item.size === size)
  if (index === -1) {
    next.push({ productId, size, quantity })
  } else {
    next[index].quantity += quantity
  }
  return validateCartItems(next)
}

export function formatEuros(cents) {
  if (!Number.isInteger(cents) || cents < 0) return null
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}
