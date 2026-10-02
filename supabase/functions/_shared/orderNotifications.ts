import { serviceClient } from './clients.ts'
import { sendPaidOrderEmails, type OrderEmailLine, type OrderEmailPayload } from './orderEmail.ts'

type AdminClient = ReturnType<typeof serviceClient>

type OutboxRow = {
  id: string
  order_id: string
  attempts: number
}

async function loadOrderEmailPayload(admin: AdminClient, orderId: string): Promise<OrderEmailPayload | null> {
  const { data: order, error } = await admin
    .from('orders')
    .select('order_number, email, locale, status, shipping_name, shipping_phone, shipping_address, subtotal_cents, discount_cents, shipping_cents, total_cents, promo_code, order_items (product_id, size, variant_label, quantity, unit_price_cents)')
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
  }
}

export async function queuePaidOrderEmail(admin: AdminClient, orderId: string) {
  const { data: order, error } = await admin
    .from('orders')
    .select('email, status')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order || order.status !== 'paid') {
    console.error('order_email_queue_lookup_failed', orderId, error)
    return false
  }

  const { error: insertError } = await admin
    .from('order_email_outbox')
    .upsert({
      order_id: orderId,
      kind: 'paid_confirmation',
      recipient: order.email,
      status: 'pending',
      next_attempt_at: new Date().toISOString(),
    }, { onConflict: 'order_id,kind', ignoreDuplicates: true })

  if (insertError) {
    console.error('order_email_queue_failed', orderId, insertError)
    return false
  }
  return true
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
      const payload = await loadOrderEmailPayload(admin, row.order_id)
      if (!payload) throw new Error('order_email_payload_missing')

      const ok = await sendPaidOrderEmails(payload, {
        customer: row.order_id,
        merchant: row.id,
      })
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
      console.error('order_email_failed', row.order_id, message)
    }
  }

  return { sent, failed }
}
