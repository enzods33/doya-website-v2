import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { serviceClient } from '../_shared/clients.ts'

const MAX_DAYS = 366
const DEFAULT_DAYS = 90

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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  let body: { action?: string; days?: number } = {}
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const action = typeof body.action === 'string' ? body.action : 'overview'
  const rangeDays = parseDays(body.days)
  const db = serviceClient()

  if (action === 'sales' || action === 'overview') {
    const { data: orders, error: ordersError } = await db
      .from('orders')
      .select('id, order_number, email, status, total_cents, paid_at, created_at')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })

    if (ordersError) {
      console.error('admin_stats_orders_failed', ordersError)
      return json(500, { error: 'stats_orders_failed' }, origin)
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
        return json(500, { error: 'stats_items_failed' }, origin)
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

    for (const item of items) {
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
    const recentOrders = paidOrders.slice(0, 25).map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      email: row.email,
      totalCents: row.total_cents,
      paidAt: row.paid_at,
    }))

    if (action === 'sales') {
      return json(200, {
        paidOrders: paidOrders.length,
        revenueCents,
        unitsSold,
        products: productSales,
        recentOrders,
      }, origin)
    }

    try {
      const audience = await buildAudience(db, rangeDays)
      return json(200, {
        sales: {
          paidOrders: paidOrders.length,
          revenueCents,
          unitsSold,
          products: productSales,
          recentOrders,
        },
        audience,
      }, origin)
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
