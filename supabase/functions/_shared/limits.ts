export const CART_LIMITS = {
  maxLineQuantity: 5,
  maxLines: 8,
  maxTotalQuantity: 12,
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  productIdPattern: /^[a-z0-9-]+$/,
} as const

export const LOCAL_ORIGINS = ['http://127.0.0.1:5174', 'http://127.0.0.1:4174']
