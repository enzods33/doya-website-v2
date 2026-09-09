import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { serviceClient } from '../_shared/clients.ts'
import { sendShippedOrderEmail, type OrderEmailLine } from '../_shared/orderEmail.ts'
import { loadShippingZones } from '../_shared/shipping.ts'
import { r2PutObject } from '../_shared/r2.ts'

const MAX_DAYS = 366
const DEFAULT_DAYS = 90
const TRACKING_MAX = 64
const MAX_IMAGE_BYTES = 4_500_000
const TSHIRT_SIZES = ['ENF', 'XS', 'S', 'M', 'L', 'XL'] as const

function slugFile(name: string) {
  const base = name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return base || 'photo'
}

function slugProductId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64)
}

function normalizePromoCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function dayKeys(count: number) {
  const days: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function parseDays(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_DAYS
  return Math.min(MAX_DAYS, Math.max(1, Math.round(n)))
}

function formatAddress(address: Record<string, unknown> | null) {
  if (!address) return null
  return {
    line1: typeof address.line1 === 'string' ? address.line1 : '',
    line2: typeof address.line2 === 'string' ? address.line2 : '',
    postalCode: typeof address.postal_code === 'string' ? address.postal_code : '',
    city: typeof address.city === 'string' ? address.city : '',
    state: typeof address.state === 'string' ? address.state : '',
    country: typeof address.country === 'string' ? address.country : '',
  }
}

async function buildAudience(db: ReturnType<typeof serviceClient>, daysCount = DEFAULT_DAYS) {
  const days = dayKeys(daysCount)
  const sinceDay = days[0]
  const [{ data: views, error: viewsError }, { data: events, error: eventsError }] = await Promise.all([
    db.from('site_pageviews').select('day, path, views').gte('day', sinceDay).order('day', { ascending: true }),
    db.from('site_events').select('day, event, place, count').gte('day', sinceDay).order('day', { ascending: true }),
  ])

  if (viewsError) {
    console.error('admin_stats_views_failed', viewsError)
    throw new Error('stats_views_failed')
  }
  if (eventsError) {
    console.error('admin_stats_events_failed', eventsError)
    throw new Error('stats_events_failed')
  }

  const rows = views ?? []
  const byDayMap = new Map<string, number>()
  const byPathMap = new Map<string, number>()
  for (const row of rows) {
    byDayMap.set(row.day, (byDayMap.get(row.day) ?? 0) + row.views)
    byPathMap.set(row.path, (byPathMap.get(row.path) ?? 0) + row.views)
  }

  const byActionMap = new Map<string, number>()
  for (const row of events ?? []) {
    const key = `${row.event}|${row.place}`
    byActionMap.set(key, (byActionMap.get(key) ?? 0) + Number(row.count || 0))
  }

  const daily = days.map((day) => ({ day, views: byDayMap.get(day) ?? 0 }))
  const today = new Date().toISOString().slice(0, 10)
  return {
    days: daysCount,
    todayViews: byDayMap.get(today) ?? 0,
    totalViews: daily.reduce((sum, row) => sum + row.views, 0),
    daily,
    topPages: [...byPathMap.entries()]
      .map(([path, count]) => ({ path, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8),
    topActions: [...byActionMap.entries()]
      .map(([key, count]) => {
        const [event, place] = key.split('|')
        return { event, place, count }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  }
}

async function buildSales(db: ReturnType<typeof serviceClient>) {
  const { data: orders, error: ordersError } = await db
    .from('orders')
    .select('id, order_number, email, status, total_cents, subtotal_cents, discount_cents, shipping_cents, promo_code, paid_at, created_at, shipping_name, shipping_phone, shipping_address, fulfillment_status, tracking_number, shipped_at')
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })

  if (ordersError) {
    console.error('admin_stats_orders_failed', ordersError)
    throw new Error('stats_orders_failed')
  }

  const paidOrders = orders ?? []
  const orderIds = paidOrders.map((row) => row.id)
  let items: {
    product_id: string
    size: string
    quantity: number
    unit_price_cents: number
    order_id: string
  }[] = []

  if (orderIds.length) {
    const { data: itemRows, error: itemsError } = await db
      .from('order_items')
      .select('product_id, size, quantity, unit_price_cents, order_id')
      .in('order_id', orderIds)
    if (itemsError) {
      console.error('admin_stats_items_failed', itemsError)
      throw new Error('stats_items_failed')
    }
    items = itemRows ?? []
  }

  const { data: products } = await db
    .from('products')
    .select('id, name, type, color')

  const productMap = new Map((products ?? []).map((p) => [p.id, p]))
  const byProduct = new Map<string, {
    productId: string
    name: string
    type: string
    color: string
    quantity: number
    revenueCents: number
    sizes: Record<string, number>
  }>()
  const itemsByOrder = new Map<string, typeof items>()

  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? []
    list.push(item)
    itemsByOrder.set(item.order_id, list)

    const meta = productMap.get(item.product_id)
    const current = byProduct.get(item.product_id) ?? {
      productId: item.product_id,
      name: meta?.name ?? item.product_id,
      type: meta?.type ?? '',
      color: meta?.color ?? '',
      quantity: 0,
      revenueCents: 0,
      sizes: {},
    }
    current.quantity += item.quantity
    current.revenueCents += item.quantity * item.unit_price_cents
    current.sizes[item.size] = (current.sizes[item.size] ?? 0) + item.quantity
    byProduct.set(item.product_id, current)
  }

  const productSales = [...byProduct.values()].sort((a, b) => b.quantity - a.quantity)
  const revenueCents = paidOrders.reduce((sum, row) => sum + (row.total_cents ?? 0), 0)
  const unitsSold = productSales.reduce((sum, row) => sum + row.quantity, 0)
  const toShipCount = paidOrders.filter((row) => (row.fulfillment_status ?? 'to_ship') !== 'shipped').length
  const inventory = await buildInventory(db)

  const orderRows = paidOrders.map((row) => {
    const orderItems = itemsByOrder.get(row.id) ?? []
    return {
      id: row.id,
      orderNumber: row.order_number,
      email: row.email,
      totalCents: row.total_cents,
      subtotalCents: row.subtotal_cents,
      discountCents: row.discount_cents,
      shippingCents: row.shipping_cents,
      promoCode: row.promo_code,
      paidAt: row.paid_at,
      shippingName: row.shipping_name,
      shippingPhone: row.shipping_phone,
      shippingAddress: formatAddress((row.shipping_address as Record<string, unknown> | null) ?? null),
      fulfillmentStatus: row.fulfillment_status ?? 'to_ship',
      trackingNumber: row.tracking_number,
      shippedAt: row.shipped_at,
      lines: orderItems.map((item) => {
        const meta = productMap.get(item.product_id)
        return {
          productId: item.product_id,
          name: meta?.name ?? item.product_id,
          type: meta?.type ?? '',
          color: meta?.color ?? '',
          size: item.size,
          quantity: item.quantity,
          unitPriceCents: item.unit_price_cents,
        }
      }),
    }
  })

  return {
    paidOrders: paidOrders.length,
    toShipCount,
    revenueCents,
    unitsSold,
    products: productSales,
    inventory,
    orders: orderRows,
    recentOrders: orderRows.slice(0, 25).map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      email: row.email,
      totalCents: row.totalCents,
      paidAt: row.paidAt,
      fulfillmentStatus: row.fulfillmentStatus,
    })),
  }
}

async function buildInventory(db: ReturnType<typeof serviceClient>) {
  const [{ data: products, error: productsError }, { data: variants, error: variantsError }] = await Promise.all([
    db.from('products')
      .select('id, name, type, color, on_sale, price_cents, sort_order, image_front_url, image_back_url, image_width, image_height, type_key, color_key, default_view')
      .neq('type', 'Test')
      .order('sort_order')
      .order('name'),
    db.from('product_variants').select('id, product_id, size, stock, reserved').order('size'),
  ])

  if (productsError || variantsError) {
    console.error('admin_stats_inventory_failed', productsError ?? variantsError)
    throw new Error('stats_inventory_failed')
  }

  const sizeRank = (size: string) => {
    const order = ['ENF', 'XS', 'S', 'M', 'L', 'XL', 'CD', 'VINYL', 'U', 'XXL']
    const index = order.indexOf(size)
    return index === -1 ? 99 : index
  }

  const byProduct = new Map<string, {
    productId: string
    name: string
    type: string | null
    color: string | null
    onSale: boolean
    priceCents: number | null
    sortOrder: number
    typeKey: string | null
    colorKey: string | null
    defaultView: string
    imageFrontUrl: string | null
    imageBackUrl: string | null
    imageWidth: number | null
    imageHeight: number | null
    variants: {
      variantId: string
      size: string
      stock: number
      reserved: number
      available: number
    }[]
  }>()

  for (const product of products ?? []) {
    byProduct.set(product.id, {
      productId: product.id,
      name: product.name,
      type: product.type ?? null,
      color: product.color ?? null,
      onSale: Boolean(product.on_sale),
      priceCents: Number.isInteger(product.price_cents) ? product.price_cents : null,
      sortOrder: Number.isInteger(product.sort_order) ? product.sort_order : 100,
      typeKey: typeof product.type_key === 'string' ? product.type_key : null,
      colorKey: typeof product.color_key === 'string' ? product.color_key : null,
      defaultView: product.default_view === 'back' ? 'back' : 'front',
      imageFrontUrl: typeof product.image_front_url === 'string' ? product.image_front_url : null,
      imageBackUrl: typeof product.image_back_url === 'string' ? product.image_back_url : null,
      imageWidth: Number.isInteger(product.image_width) ? product.image_width : null,
      imageHeight: Number.isInteger(product.image_height) ? product.image_height : null,
      variants: [],
    })
  }

  for (const variant of variants ?? []) {
    const row = byProduct.get(variant.product_id)
    if (!row) continue
    const stock = Math.max(0, Number(variant.stock) || 0)
    const reserved = Math.max(0, Number(variant.reserved) || 0)
    row.variants.push({
      variantId: variant.id,
      size: variant.size,
      stock,
      reserved,
      available: Math.max(0, stock - reserved),
    })
  }

  return [...byProduct.values()]
    .map((row) => ({
      ...row,
      variants: row.variants.sort((a, b) => sizeRank(a.size) - sizeRank(b.size)),
    }))
    .filter((row) => row.variants.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

async function buildPromos(db: ReturnType<typeof serviceClient>) {
  const { data, error } = await db
    .from('promo_codes')
    .select('id, code, percent_off, amount_off_cents, min_subtotal_cents, max_redemptions, redeemed, held, starts_at, ends_at, active, one_per_customer, auto_apply, min_tee_qty, min_cd_qty, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('admin_stats_promos_failed', error)
    throw new Error('stats_promos_failed')
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    percentOff: row.percent_off == null ? null : Number(row.percent_off),
    amountOffCents: row.amount_off_cents == null ? null : Number(row.amount_off_cents),
    minSubtotalCents: Number(row.min_subtotal_cents) || 0,
    maxRedemptions: row.max_redemptions == null ? null : Number(row.max_redemptions),
    redeemed: Number(row.redeemed) || 0,
    held: Number(row.held) || 0,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    active: Boolean(row.active),
    onePerCustomer: Boolean(row.one_per_customer),
    autoApply: Boolean(row.auto_apply),
    minTeeQty: row.min_tee_qty == null ? null : Number(row.min_tee_qty),
    minCdQty: row.min_cd_qty == null ? null : Number(row.min_cd_qty),
    createdAt: row.created_at,
  }))
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  const contentType = req.headers.get('content-type') ?? ''
  const db = serviceClient()

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return json(400, { error: 'invalid_file' }, origin)
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return json(400, { error: 'file_too_large' }, origin)
    const mime = (file.type || '').toLowerCase()
    if (mime !== 'image/jpeg' && mime !== 'image/jpg') {
      return json(400, { error: 'invalid_image_type' }, origin)
    }

    const sideRaw = String(form.get('side') || 'front').toLowerCase()
    const side = sideRaw === 'back' ? 'back' : 'front'
    const productHint = slugProductId(String(form.get('productId') || 'product')) || 'product'
    const bytes = new Uint8Array(await file.arrayBuffer())
    const key = `shop/web/${productHint}-${side}-${Date.now()}-${slugFile(file.name)}.jpg`
    let publicUrl = ''
    try {
      publicUrl = await r2PutObject(key, bytes, 'image/jpeg')
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      console.error('shop_r2_upload_failed', detail)
      return json(502, { error: 'r2_upload_failed', detail: detail.slice(0, 200) }, origin)
    }

    const width = Number(form.get('width') || 1200)
    const height = Number(form.get('height') || 1200)
    return json(200, {
      publicUrl,
      storageKey: key,
      side,
      width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1200,
      height: Number.isFinite(height) && height > 0 ? Math.round(height) : 1200,
    }, origin)
  }

  let body: {
    action?: string
    days?: number
    orderId?: string
    trackingNumber?: string
    updates?: { variantId?: string; stock?: number }[]
    productId?: string
    priceCents?: number
    onSale?: boolean
    sortOrder?: number
    order?: { productId?: string; sortOrder?: number }[]
    shipping?: { id?: string; amountCents?: number }[]
    promo?: {
      code?: string
      amountOffCents?: number
      percentOff?: number
      maxRedemptions?: number | null
      active?: boolean
      onePerCustomer?: boolean
      startsAt?: string | null
      endsAt?: string | null
    }
    promoId?: string
    active?: boolean
    amountOffCents?: number
    product?: {
      id?: string
      name?: string
      type?: string
      color?: string
      typeKey?: string
      colorKey?: string
      priceCents?: number
      onSale?: boolean
      sortOrder?: number
      imageFrontUrl?: string
      imageBackUrl?: string | null
      imageWidth?: number
      imageHeight?: number
      stocks?: Record<string, number>
    }
  } = {}
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const action = typeof body.action === 'string' ? body.action : 'overview'
  const rangeDays = parseDays(body.days)

  if (action === 'update_stocks') {
    const rawUpdates = Array.isArray(body.updates) ? body.updates : []
    if (!rawUpdates.length || rawUpdates.length > 80) {
      return json(400, { error: 'invalid_stock_updates' }, origin)
    }

    const updates: { variantId: string; stock: number }[] = []
    for (const row of rawUpdates) {
      const variantId = typeof row.variantId === 'string' ? row.variantId.trim() : ''
      const stock = Number(row.stock)
      if (!/^[0-9a-f-]{36}$/i.test(variantId)) {
        return json(400, { error: 'invalid_variant' }, origin)
      }
      if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
        return json(400, { error: 'invalid_stock' }, origin)
      }
      updates.push({ variantId, stock })
    }

    const ids = updates.map((row) => row.variantId)
    const { data: current, error: currentError } = await db
      .from('product_variants')
      .select('id, reserved, product_id')
      .in('id', ids)

    if (currentError) {
      console.error('admin_update_stocks_lookup_failed', currentError)
      return json(500, { error: 'stock_update_failed' }, origin)
    }
    if ((current ?? []).length !== ids.length) {
      return json(404, { error: 'variant_not_found' }, origin)
    }

    const reservedById = new Map((current ?? []).map((row) => [row.id, Math.max(0, Number(row.reserved) || 0)]))
    for (const row of updates) {
      const reserved = reservedById.get(row.variantId) ?? 0
      if (row.stock < reserved) {
        return json(400, { error: 'stock_below_reserved', variantId: row.variantId, reserved }, origin)
      }
    }

    for (const row of updates) {
      const { error: updateError } = await db
        .from('product_variants')
        .update({ stock: row.stock })
        .eq('id', row.variantId)
      if (updateError) {
        console.error('admin_update_stocks_failed', updateError)
        return json(500, { error: 'stock_update_failed' }, origin)
      }
    }

    try {
      const inventory = await buildInventory(db)
      return json(200, { ok: true, inventory }, origin)
    } catch {
      return json(200, { ok: true }, origin)
    }
  }

  if (action === 'update_price') {
    const productId = typeof body.productId === 'string' ? body.productId.trim() : ''
    const priceCents = Number(body.priceCents)
    const onSale = body.onSale !== false
    if (!/^[a-z0-9-]+$/.test(productId)) return json(400, { error: 'invalid_product' }, origin)
    if (!Number.isInteger(priceCents) || priceCents < 50 || priceCents > 500000) {
      return json(400, { error: 'invalid_price' }, origin)
    }

    const { error } = await db
      .from('products')
      .update({
        price_cents: priceCents,
        on_sale: onSale,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (error) {
      console.error('admin_update_price_failed', error)
      return json(500, { error: 'price_update_failed' }, origin)
    }

    const inventory = await buildInventory(db)
    return json(200, { ok: true, inventory }, origin)
  }

  if (action === 'update_sort_order') {
    const rawOrder = Array.isArray(body.order) ? body.order : []
    if (!rawOrder.length || rawOrder.length > 80) {
      return json(400, { error: 'invalid_sort_order' }, origin)
    }

    const rows: { productId: string; sortOrder: number }[] = []
    for (const entry of rawOrder) {
      const productId = typeof entry.productId === 'string' ? entry.productId.trim() : ''
      const sortOrder = Number(entry.sortOrder)
      if (!/^[a-z0-9-]+$/.test(productId)) return json(400, { error: 'invalid_product' }, origin)
      if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
        return json(400, { error: 'invalid_sort_order' }, origin)
      }
      rows.push({ productId, sortOrder })
    }

    for (const row of rows) {
      const { error } = await db
        .from('products')
        .update({ sort_order: row.sortOrder, updated_at: new Date().toISOString() })
        .eq('id', row.productId)
      if (error) {
        console.error('admin_update_sort_failed', error)
        return json(500, { error: 'sort_update_failed' }, origin)
      }
    }

    const inventory = await buildInventory(db)
    return json(200, { ok: true, inventory }, origin)
  }

  if (action === 'list_shipping' || action === 'inventory') {
    try {
      const [inventory, shipping] = await Promise.all([
        buildInventory(db),
        loadShippingZones(db),
      ])
      return json(200, {
        inventory,
        shipping: shipping.map((zone) => ({
          id: zone.id,
          displayName: zone.displayName,
          amountCents: zone.amountCents,
          countries: zone.countries,
        })),
      }, origin)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'stats_inventory_failed'
      return json(500, { error: code }, origin)
    }
  }

  if (action === 'update_shipping') {
    const raw = Array.isArray(body.shipping) ? body.shipping : []
    if (!raw.length || raw.length > 20) return json(400, { error: 'invalid_shipping' }, origin)

    for (const row of raw) {
      const id = typeof row.id === 'string' ? row.id.trim() : ''
      const amountCents = Number(row.amountCents)
      if (!id) return json(400, { error: 'invalid_shipping' }, origin)
      if (!Number.isInteger(amountCents) || amountCents < 0 || amountCents > 50000) {
        return json(400, { error: 'invalid_shipping_amount' }, origin)
      }
      const { error } = await db
        .from('shipping_zones')
        .update({ amount_cents: amountCents, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        console.error('admin_update_shipping_failed', error)
        return json(500, { error: 'shipping_update_failed' }, origin)
      }
    }

    const shipping = await loadShippingZones(db)
    return json(200, {
      ok: true,
      shipping: shipping.map((zone) => ({
        id: zone.id,
        displayName: zone.displayName,
        amountCents: zone.amountCents,
        countries: zone.countries,
      })),
    }, origin)
  }

  if (action === 'list_promos') {
    try {
      const promos = await buildPromos(db)
      return json(200, { promos }, origin)
    } catch {
      return json(500, { error: 'stats_promos_failed' }, origin)
    }
  }

  if (action === 'create_promo') {
    const promo = body.promo ?? {}
    const code = normalizePromoCode(typeof promo.code === 'string' ? promo.code : '')
    if (!code || code.length < 3 || code.length > 32 || !/^[A-Z0-9_-]+$/.test(code)) {
      return json(400, { error: 'invalid_promo_code' }, origin)
    }

    const amountOffCents = promo.amountOffCents == null ? null : Number(promo.amountOffCents)
    const percentOff = promo.percentOff == null ? null : Number(promo.percentOff)
    const hasAmount = Number.isInteger(amountOffCents) && (amountOffCents as number) > 0
    const hasPercent = Number.isFinite(percentOff) && (percentOff as number) > 0 && (percentOff as number) <= 100
    if (hasAmount === hasPercent) {
      return json(400, { error: 'invalid_promo_discount' }, origin)
    }
    if (hasAmount && ((amountOffCents as number) < 50 || (amountOffCents as number) > 50000)) {
      return json(400, { error: 'invalid_promo_discount' }, origin)
    }

    let maxRedemptions: number | null = null
    if (promo.maxRedemptions != null && promo.maxRedemptions !== '') {
      const max = Number(promo.maxRedemptions)
      if (!Number.isInteger(max) || max < 1 || max > 100000) {
        return json(400, { error: 'invalid_promo_cap' }, origin)
      }
      maxRedemptions = max
    }

    let startsAt: string | null = null
    if (typeof promo.startsAt === 'string' && promo.startsAt.trim()) {
      const parsed = new Date(promo.startsAt)
      if (Number.isNaN(parsed.getTime())) return json(400, { error: 'invalid_promo_starts' }, origin)
      startsAt = parsed.toISOString()
    }

    let endsAt: string | null = null
    if (typeof promo.endsAt === 'string' && promo.endsAt.trim()) {
      const parsed = new Date(promo.endsAt)
      if (Number.isNaN(parsed.getTime())) return json(400, { error: 'invalid_promo_ends' }, origin)
      endsAt = parsed.toISOString()
    }

    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      return json(400, { error: 'invalid_promo_range' }, origin)
    }

    const { data, error } = await db
      .from('promo_codes')
      .insert({
        code,
        amount_off_cents: hasAmount ? amountOffCents : null,
        percent_off: hasPercent ? Math.round((percentOff as number) * 100) / 100 : null,
        max_redemptions: maxRedemptions,
        active: promo.active !== false,
        one_per_customer: promo.onePerCustomer !== false,
        auto_apply: false,
        starts_at: startsAt,
        ends_at: endsAt,
      })
      .select('id, code, percent_off, amount_off_cents, max_redemptions, redeemed, held, starts_at, ends_at, active, one_per_customer, auto_apply, created_at')
      .single()

    if (error) {
      console.error('admin_create_promo_failed', error)
      if (String(error.message || '').includes('duplicate') || error.code === '23505') {
        return json(409, { error: 'promo_exists' }, origin)
      }
      return json(500, { error: 'promo_create_failed' }, origin)
    }

    return json(200, {
      ok: true,
      promo: {
        id: data.id,
        code: data.code,
        percentOff: data.percent_off == null ? null : Number(data.percent_off),
        amountOffCents: data.amount_off_cents == null ? null : Number(data.amount_off_cents),
        maxRedemptions: data.max_redemptions == null ? null : Number(data.max_redemptions),
        redeemed: Number(data.redeemed) || 0,
        held: Number(data.held) || 0,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
        active: Boolean(data.active),
        onePerCustomer: Boolean(data.one_per_customer),
        autoApply: Boolean(data.auto_apply),
        createdAt: data.created_at,
      },
    }, origin)
  }

  if (action === 'update_promo') {
    const promoId = typeof body.promoId === 'string' ? body.promoId.trim() : ''
    if (!/^[0-9a-f-]{36}$/i.test(promoId)) return json(400, { error: 'invalid_promo' }, origin)

    const patch: {
      active?: boolean
      amount_off_cents?: number
    } = {}

    if (typeof body.active === 'boolean') patch.active = body.active

    if (body.amountOffCents != null || (body.promo && body.promo.amountOffCents != null)) {
      const amountOffCents = Number(
        body.amountOffCents != null ? body.amountOffCents : body.promo?.amountOffCents,
      )
      if (!Number.isInteger(amountOffCents) || amountOffCents < 50 || amountOffCents > 50000) {
        return json(400, { error: 'invalid_promo_discount' }, origin)
      }
      patch.amount_off_cents = amountOffCents
    }

    if (!Object.keys(patch).length) {
      return json(400, { error: 'invalid_promo_update' }, origin)
    }

    const { error } = await db
      .from('promo_codes')
      .update(patch)
      .eq('id', promoId)

    if (error) {
      console.error('admin_update_promo_failed', error)
      return json(500, { error: 'promo_update_failed' }, origin)
    }

    const promos = await buildPromos(db)
    return json(200, { ok: true, promos }, origin)
  }

  if (action === 'upsert_product') {
    const product = body.product ?? {}
    const productId = slugProductId(typeof product.id === 'string' ? product.id : '')
    const name = typeof product.name === 'string' ? product.name.trim() : ''
    const typeKey = typeof product.typeKey === 'string' ? product.typeKey.trim() : 'tshirt'
    const colorRaw = typeof product.color === 'string' ? product.color.trim() : ''
    const colorKeyRaw = typeof product.colorKey === 'string' ? product.colorKey.trim().toLowerCase() : ''
    const colorKey = colorKeyRaw || (colorRaw
      ? colorRaw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'default')
    const priceCents = Number(product.priceCents)
    const onSale = product.onSale !== false
    const sortOrder = Number.isInteger(Number(product.sortOrder)) ? Number(product.sortOrder) : 100
    const imageFrontUrl = typeof product.imageFrontUrl === 'string' ? product.imageFrontUrl.trim() : ''
    const imageBackUrl = typeof product.imageBackUrl === 'string' && product.imageBackUrl.trim()
      ? product.imageBackUrl.trim()
      : null
    const imageWidth = Number(product.imageWidth)
    const imageHeight = Number(product.imageHeight)

    if (!productId || !/^[a-z0-9-]+$/.test(productId)) return json(400, { error: 'invalid_product' }, origin)
    if (!name || name.length > 80) return json(400, { error: 'invalid_product_name' }, origin)
    if (!['tshirt', 'cd', 'other'].includes(typeKey)) return json(400, { error: 'invalid_product_type' }, origin)
    if (!colorKey || colorKey.length > 32 || !/^[a-z0-9-]+$/.test(colorKey)) {
      return json(400, { error: 'invalid_product_color' }, origin)
    }
    if (!Number.isInteger(priceCents) || priceCents < 50 || priceCents > 500000) {
      return json(400, { error: 'invalid_price' }, origin)
    }
    if (!imageFrontUrl || !/^https:\/\//i.test(imageFrontUrl)) {
      return json(400, { error: 'invalid_product_image' }, origin)
    }
    if (imageBackUrl && !/^https:\/\//i.test(imageBackUrl)) {
      return json(400, { error: 'invalid_product_image' }, origin)
    }

    const typeLabel = typeof product.type === 'string' && product.type.trim()
      ? product.type.trim()
      : (typeKey === 'cd' ? 'CD' : typeKey === 'tshirt' ? 'T-shirt' : 'Article')
    const colorLabel = colorRaw || colorKey

    const { error: productError } = await db.from('products').upsert({
      id: productId,
      name,
      type: typeLabel,
      color: colorLabel,
      type_key: typeKey,
      color_key: colorKey,
      price_cents: priceCents,
      currency: 'eur',
      on_sale: onSale,
      sort_order: sortOrder,
      image_front_url: imageFrontUrl,
      image_back_url: imageBackUrl,
      image_width: Number.isInteger(imageWidth) && imageWidth > 0 ? imageWidth : 1200,
      image_height: Number.isInteger(imageHeight) && imageHeight > 0 ? imageHeight : 1200,
      default_view: 'front',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (productError) {
      console.error('admin_upsert_product_failed', productError)
      return json(500, { error: 'product_upsert_failed' }, origin)
    }

    const stocks = product.stocks && typeof product.stocks === 'object' ? product.stocks : {}
    const sizes = typeKey === 'cd' ? (['CD'] as const) : TSHIRT_SIZES
    for (const size of sizes) {
      const stock = Number((stocks as Record<string, number>)[size] ?? 0)
      if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
        return json(400, { error: 'invalid_stock' }, origin)
      }
      const { data: existing } = await db
        .from('product_variants')
        .select('id, reserved')
        .eq('product_id', productId)
        .eq('size', size)
        .maybeSingle()

      if (existing) {
        const reserved = Math.max(0, Number(existing.reserved) || 0)
        if (stock < reserved) {
          return json(400, { error: 'stock_below_reserved', size, reserved }, origin)
        }
        const { error } = await db.from('product_variants').update({ stock }).eq('id', existing.id)
        if (error) {
          console.error('admin_upsert_variant_failed', error)
          return json(500, { error: 'product_upsert_failed' }, origin)
        }
      } else {
        const { error } = await db.from('product_variants').insert({
          product_id: productId,
          size,
          stock,
          reserved: 0,
        })
        if (error) {
          console.error('admin_insert_variant_failed', error)
          return json(500, { error: 'product_upsert_failed' }, origin)
        }
      }
    }

    const inventory = await buildInventory(db)
    return json(200, { ok: true, inventory, productId }, origin)
  }

  if (action === 'mark_shipped') {
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
    const trackingNumber = typeof body.trackingNumber === 'string' ? body.trackingNumber.trim() : ''
    if (!orderId) return json(400, { error: 'invalid_order' }, origin)
    if (!trackingNumber || trackingNumber.length > TRACKING_MAX) {
      return json(400, { error: 'invalid_tracking' }, origin)
    }

    const { data: order, error: orderError } = await db
      .from('orders')
      .select('id, order_number, email, status, shipping_name, shipping_phone, shipping_address, subtotal_cents, discount_cents, shipping_cents, total_cents, promo_code, fulfillment_status, tracking_number, order_items (product_id, size, quantity, unit_price_cents)')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      console.error('admin_mark_shipped_lookup_failed', orderError)
      return json(404, { error: 'order_not_found' }, origin)
    }
    if (order.status !== 'paid') return json(400, { error: 'order_not_paid' }, origin)
    if (order.fulfillment_status === 'shipped') {
      return json(400, { error: 'already_shipped' }, origin)
    }

    const shippedAt = new Date().toISOString()
    const { error: updateError } = await db
      .from('orders')
      .update({
        fulfillment_status: 'shipped',
        tracking_number: trackingNumber,
        shipped_at: shippedAt,
      })
      .eq('id', orderId)
      .eq('status', 'paid')
      .neq('fulfillment_status', 'shipped')

    if (updateError) {
      console.error('admin_mark_shipped_update_failed', updateError)
      return json(500, { error: 'ship_update_failed' }, origin)
    }

    const productIds = [...new Set((order.order_items ?? []).map((item: { product_id: string }) => item.product_id))]
    const { data: products } = productIds.length
      ? await db.from('products').select('id, name').in('id', productIds)
      : { data: [] as { id: string; name: string }[] }
    const names = new Map((products ?? []).map((row) => [row.id, row.name]))
    const lines: OrderEmailLine[] = (order.order_items ?? []).map((item: {
      product_id: string
      size: string
      quantity: number
      unit_price_cents: number
    }) => ({
      name: names.get(item.product_id) ?? item.product_id,
      size: item.size,
      quantity: item.quantity,
      unitPriceCents: item.unit_price_cents,
    }))

    let emailSent = false
    try {
      emailSent = await sendShippedOrderEmail({
        orderNumber: order.order_number,
        email: order.email,
        shippingName: order.shipping_name,
        shippingPhone: order.shipping_phone,
        shippingAddress: (order.shipping_address as Record<string, unknown> | null) ?? null,
        subtotalCents: order.subtotal_cents,
        discountCents: order.discount_cents,
        shippingCents: order.shipping_cents,
        totalCents: order.total_cents,
        promoCode: order.promo_code,
        lines,
        trackingNumber,
      })
    } catch (mailError) {
      console.error('shipped_email_failed', mailError)
    }

    return json(200, {
      ok: true,
      orderId,
      fulfillmentStatus: 'shipped',
      trackingNumber,
      shippedAt,
      emailSent,
    }, origin)
  }

  if (action === 'sales' || action === 'overview') {
    let sales
    try {
      sales = await buildSales(db)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'stats_orders_failed'
      return json(500, { error: code }, origin)
    }

    if (action === 'sales') {
      return json(200, sales, origin)
    }

    try {
      const audience = await buildAudience(db, rangeDays)
      return json(200, { sales, audience }, origin)
    } catch (error) {
      const code = error instanceof Error && error.message === 'stats_events_failed'
        ? 'stats_events_failed'
        : 'stats_views_failed'
      return json(500, { error: code }, origin)
    }
  }

  if (action === 'audience') {
    try {
      const audience = await buildAudience(db, rangeDays)
      return json(200, audience, origin)
    } catch (error) {
      const code = error instanceof Error && error.message === 'stats_events_failed'
        ? 'stats_events_failed'
        : 'stats_views_failed'
      return json(500, { error: code }, origin)
    }
  }

  return json(400, { error: 'invalid_action' }, origin)
})
