import { products } from '../data/products.js'

function normalizeDefaultView(value, fallback = 'front') {
  return value === 'back' || value === 'front' ? value : fallback
}

function localCatalog() {
  return {
    items: products.map((product) => ({
      ...product,
      defaultView: normalizeDefaultView(product.defaultView),
      sale: null,
      variants: [],
    })),
    purchasable: false,
  }
}

export async function loadCatalog() {
  const local = new Map(
    products.map((product) => [
      product.id,
      {
        ...product,
        defaultView: normalizeDefaultView(product.defaultView),
        sale: null,
        variants: [],
      },
    ]),
  )

  try {
    const { supabase } = await import('./supabase.js')
    if (!supabase) return localCatalog()

    const [{ data: remoteProducts, error: productError }, { data: remoteVariants, error: variantError }] = await Promise.all([
      supabase.from('catalog_products').select('id, price_cents, currency, default_view'),
      supabase.from('catalog_variants').select('product_id, size, available'),
    ])

    if (productError || variantError || !remoteProducts) return localCatalog()

    for (const row of remoteProducts) {
      const current = local.get(row.id)
      if (!current || row.currency !== 'eur' || !Number.isInteger(row.price_cents) || row.price_cents <= 0) continue
      current.sale = { priceCents: row.price_cents, currency: row.currency }
      current.defaultView = normalizeDefaultView(row.default_view, current.defaultView)
      current.variants = (remoteVariants ?? [])
        .filter((variant) => variant.product_id === row.id)
        .map((variant) => ({ size: variant.size, available: Math.max(0, variant.available ?? 0) }))
    }

    const items = [...local.values()]
    return { items, purchasable: items.some((item) => item.sale && item.variants.some((variant) => variant.available > 0)) }
  } catch {
    return localCatalog()
  }
}

export function availableFor(product, size) {
  return product.variants.find((variant) => variant.size === size)?.available ?? 0
}
