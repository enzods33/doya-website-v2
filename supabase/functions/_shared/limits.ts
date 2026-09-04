export const CART_LIMITS = {
  maxLineQuantity: 5,
  maxLines: 8,
  maxTotalQuantity: 12,
  /** U = unique (CD / articles sans taillage) */
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'U'],
  productIdPattern: /^[a-z0-9-]+$/,
} as const

export const LOCAL_ORIGINS = [
  'http://127.0.0.1:5174',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4174',
  'http://localhost:4174',
]
