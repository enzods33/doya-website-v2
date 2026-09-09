import { products } from '../data/products.js'

function normalizeDefaultView(value, fallback = 'front') {
  return value === 'back' || value === 'front' ? value : fallback
}

function inferTypeKey(type, typeKey) {
  if (typeKey === 'tshirt' || typeKey === 'cd' || typeKey === 'other') return typeKey
  const raw = String(type || '').toLowerCase()
  if (raw.includes('cd')) return 'cd'
  if (raw.includes('t-shirt') || raw.includes('tee')) return 'tshirt'
  return 'other'
}

function localCatalog() {
  return {
    items: products.map((product, index) => ({
      ...product,
      displayName: product.id,
      defaultView: normalizeDefaultView(product.defaultView),
      sortOrder: (index + 1) * 10,
      sale: null,
      variants: [],
    })),
    purchasable: false,
  }
}

function remoteToItem(row, local) {
  const typeKey = inferTypeKey(row.type, row.type_key) || local?.typeKey || 'tshirt'
  const colorKey = typeof row.color_key === 'string' && row.color_key
    ? row.color_key
    : (local?.colorKey || 'black')
  return {
    id: row.id,
    typeKey,
    colorKey,
    type: row.type || local?.type || null,
    color: row.color || local?.color || null,
    name: row.name || local?.name || null,
    displayName: row.name || local?.displayName || row.id,
    defaultView: normalizeDefaultView(row.default_view, local?.defaultView),
    front: row.image_front_url || local?.front || null,
    back: row.image_back_url || local?.back || null,
    width: Number.isInteger(row.image_width) && row.image_width > 0
      ? row.image_width
      : (local?.width || 1200),
    height: Number.isInteger(row.image_height) && row.image_height > 0
      ? row.image_height
      : (local?.height || 1200),
    price: null,
    url: local?.url ?? null,
    sortOrder: Number.isInteger(row.sort_order) ? row.sort_order : (local?.sortOrder ?? 100),
    sale: null,
    variants: [],
  }
}

export async function loadCatalog() {
  const local = new Map(
    products.map((product, index) => [
      product.id,
      {
        ...product,
        displayName: product.id,
        defaultView: normalizeDefaultView(product.defaultView),
        sortOrder: (index + 1) * 10,
        sale: null,
        variants: [],
      },
    ]),
  )

  try {
    const { supabase } = await import('./supabase.js')
    if (!supabase) return localCatalog()

    const [{ data: remoteProducts, error: productError }, { data: remoteVariants, error: variantError }] = await Promise.all([
      supabase.from('catalog_products').select(
        'id, name, type, color, price_cents, currency, default_view, sort_order, image_front_url, image_back_url, image_width, image_height, type_key, color_key',
      ),
      supabase.from('catalog_variants').select('product_id, size, available'),
    ])

    if (productError || variantError || !remoteProducts) return localCatalog()

    // catalogue_products = on_sale only → les articles masqués n’apparaissent pas
    const items = []
    for (const row of remoteProducts) {
      if (row.currency !== 'eur' || !Number.isInteger(row.price_cents) || row.price_cents <= 0) continue
      const current = remoteToItem(row, local.get(row.id))
      if (!current.front) continue
      current.sale = { priceCents: row.price_cents, currency: row.currency }
      current.variants = (remoteVariants ?? [])
        .filter((variant) => variant.product_id === row.id)
        .map((variant) => ({ size: variant.size, available: Math.max(0, variant.available ?? 0) }))
      items.push(current)
    }

    items.sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.id.localeCompare(b.id))

    return {
      items,
      purchasable: items.some((item) => item.sale && item.variants.some((variant) => variant.available > 0)),
    }
  } catch {
    return localCatalog()
  }
}

export function availableFor(product, size) {
  return product.variants.find((variant) => variant.size === size)?.available ?? 0
}
