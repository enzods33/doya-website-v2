export const CART_LIMITS = {
  maxLineQuantity: 6,
  maxLines: 8,
  maxTotalQuantity: 12,
  /** U = unique (CD / articles sans taillage) */
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'U'],
  productIdPattern: /^[a-z0-9-]+$/,
} as const

/** Miroir SQL : tee ≤ 6, CD ≤ 5 pour le forfait ; au-delà = shipping_quote_required. */
export const FLAT_SHIPPING_LIMITS = {
  maxTees: 6,
  maxCds: 5,
} as const

export const LOCAL_ORIGINS = [
  'http://127.0.0.1:5174',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4174',
  'http://localhost:4174',
]
