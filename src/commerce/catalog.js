import { products } from '../data/products.js'
import { supabase } from './supabase.js'

export async function loadCatalog() {
  const local = new Map(products.map((product) => [product.id, { ...product, sale: null, variants: [] }]))
  if (!supabase) return { items: [...local.values()], purchasable: false }

  const [{ data: remoteProducts, error: productError }, { data: remoteVariants, error: variantError }] = await Promise.all([
    supabase.from('catalog_products').select('id, price_cents, currency'),
    supabase.from('catalog_variants').select('product_id, size, available'),
  ])

  if (productError || variantError || !remoteProducts) {
    return { items: [...local.values()], purchasable: false }
  }

  for (const row of remoteProducts) {
    const current = local.get(row.id)
    if (!current || row.currency !== 'eur' || !Number.isInteger(row.price_cents) || row.price_cents <= 0) continue
    current.sale = { priceCents: row.price_cents, currency: row.currency }
    current.variants = (remoteVariants ?? [])
      .filter((variant) => variant.product_id === row.id)
      .map((variant) => ({ size: variant.size, available: Math.max(0, variant.available ?? 0) }))
  }

  const items = [...local.values()]
  return { items, purchasable: items.some((item) => item.sale && item.variants.some((variant) => variant.available > 0)) }
}

export function availableFor(product, size) {
  return product.variants.find((variant) => variant.size === size)?.available ?? 0
}
