import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { serviceClient } from '../_shared/clients.ts'
import { sendShippedOrderEmail, type OrderEmailLine } from '../_shared/orderEmail.ts'

const MAX_DAYS = 366
const DEFAULT_DAYS = 90
const TRACKING_MAX = 64

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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  let body: {
    action?: string
    days?: number
    orderId?: string
    trackingNumber?: string
  } = {}
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const action = typeof body.action === 'string' ? body.action : 'overview'
  const rangeDays = parseDays(body.days)
  const db = serviceClient()

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
