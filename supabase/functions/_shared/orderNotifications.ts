import { serviceClient } from './clients.ts'
import {
  sendPaidOrderEmails,
  sendShippedOrderEmail,
  type OrderEmailLine,
  type OrderEmailPayload,
} from './orderEmail.ts'

type AdminClient = ReturnType<typeof serviceClient>
type OrderEmailKind = 'paid_confirmation' | 'shipped_notification'

type OutboxRow = {
  id: string
  order_id: string
  kind: OrderEmailKind
  attempts: number
}

type LoadedOrderEmail = {
  payload: OrderEmailPayload
  fulfillmentStatus: string | null
  trackingNumber: string | null
}

async function loadOrderEmailPayload(admin: AdminClient, orderId: string): Promise<LoadedOrderEmail | null> {
  const { data: order, error } = await admin
    .from('orders')
    .select('order_number, email, locale, status, fulfillment_status, tracking_number, shipping_name, shipping_phone, shipping_address, subtotal_cents, discount_cents, shipping_cents, total_cents, promo_code, order_items (product_id, size, variant_label, quantity, unit_price_cents)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order?.order_number || order.status !== 'paid') {
    console.error('order_email_lookup_failed', orderId, error)
    return null
  }

  const productIds = [...new Set((order.order_items ?? []).map((item: { product_id: string }) => item.product_id))]
  const { data: products } = productIds.length
    ? await admin.from('products').select('id, name').in('id', productIds)
    : { data: [] as { id: string; name: string }[] }
  const names = new Map((products ?? []).map((row) => [row.id, row.name]))

  const lines: OrderEmailLine[] = (order.order_items ?? []).map((item: {
    product_id: string
    size: string
    variant_label: string
    quantity: number
    unit_price_cents: number
  }) => ({
    productId: item.product_id,
    name: names.get(item.product_id) ?? item.product_id,
    size: item.size,
    variantLabel: item.variant_label,
    quantity: item.quantity,
    unitPriceCents: item.unit_price_cents,
  }))

  return {
    payload: {
      orderNumber: order.order_number,
      email: order.email,
      locale: order.locale ?? 'fr',
      shippingName: order.shipping_name,
      shippingPhone: order.shipping_phone ?? null,
      shippingAddress: (order.shipping_address as Record<string, unknown> | null) ?? null,
      subtotalCents: order.subtotal_cents,
      discountCents: order.discount_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
      promoCode: order.promo_code,
      lines,
    },
    fulfillmentStatus: order.fulfillment_status ?? null,
    trackingNumber: typeof order.tracking_number === 'string' ? order.tracking_number.trim() : null,
  }
}

async function queueOrderEmail(
  admin: AdminClient,
  orderId: string,
  kind: OrderEmailKind,
): Promise<string | null> {
  const { data: order, error } = await admin
    .from('orders')
    .select('email, status, fulfillment_status, tracking_number')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order || order.status !== 'paid') {
    console.error('order_email_queue_lookup_failed', orderId, kind, error)
    return null
  }
  if (kind === 'shipped_notification'
    && (order.fulfillment_status !== 'shipped' || !String(order.tracking_number ?? '').trim())) {
    console.error('order_shipping_email_not_ready', orderId)
    return null
  }

  const { error: insertError } = await admin
    .from('order_email_outbox')
    .upsert({
      order_id: orderId,
      kind,
      recipient: order.email,
      status: 'pending',
      next_attempt_at: new Date().toISOString(),
    }, { onConflict: 'order_id,kind', ignoreDuplicates: true })

  if (insertError) {
    console.error('order_email_queue_failed', orderId, kind, insertError)
    return null
  }

  const { data: queued, error: lookupError } = await admin
    .from('order_email_outbox')
    .select('id')
    .eq('order_id', orderId)
    .eq('kind', kind)
    .maybeSingle()

  if (lookupError || !queued?.id) {
    console.error('order_email_queue_id_failed', orderId, kind, lookupError)
    return null
  }
  return queued.id
}

export async function queuePaidOrderEmail(admin: AdminClient, orderId: string) {
  return Boolean(await queueOrderEmail(admin, orderId, 'paid_confirmation'))
}

export async function queueShippedOrderEmail(admin: AdminClient, orderId: string) {
  return queueOrderEmail(admin, orderId, 'shipped_notification')
}

export async function requeuePaidOrderEmail(admin: AdminClient, orderId: string) {
  const queuedId = await queueOrderEmail(admin, orderId, 'paid_confirmation')
  if (!queuedId) return null

  const { error } = await admin
    .from('order_email_outbox')
    .update({
      status: 'pending',
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      sent_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', queuedId)

  if (error) {
    console.error('order_email_requeue_failed', orderId, error)
    return null
  }
  return queuedId
}

function nextRetryIso(attempts: number) {
  const minutes = Math.min(360, 5 * (2 ** Math.max(0, attempts - 1)))
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

export async function processDueOrderEmails(admin: AdminClient, limit = 10) {
  const { data, error } = await admin.rpc('claim_due_order_emails', { p_limit: limit })
  if (error) {
    console.error('order_email_claim_failed', error)
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  for (const row of (data ?? []) as OutboxRow[]) {
    try {
      const loaded = await loadOrderEmailPayload(admin, row.order_id)
      if (!loaded) throw new Error('order_email_payload_missing')

      let ok = false
      if (row.kind === 'paid_confirmation') {
        ok = await sendPaidOrderEmails(loaded.payload, row.id)
      } else if (row.kind === 'shipped_notification') {
        if (loaded.fulfillmentStatus !== 'shipped' || !loaded.trackingNumber) {
          throw new Error('order_shipping_email_not_ready')
        }
        ok = await sendShippedOrderEmail({
          ...loaded.payload,
          trackingNumber: loaded.trackingNumber,
        }, row.id)
      } else {
        throw new Error('unknown_order_email_kind')
      }

      if (!ok) throw new Error('order_email_delivery_failed')

      const { error: updateError } = await admin
        .from('order_email_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)

      if (updateError) throw updateError
      sent += 1
    } catch (caught) {
      failed += 1
      const message = caught instanceof Error ? caught.message.slice(0, 240) : 'order_email_failed'
      const { error: updateError } = await admin
        .from('order_email_outbox')
        .update({
          status: 'failed',
          next_attempt_at: nextRetryIso(row.attempts),
          last_error: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      if (updateError) console.error('order_email_retry_state_failed', row.id, updateError)
      console.error('order_email_failed', row.order_id, row.kind, message)
    }
  }

  return { sent, failed }
}
