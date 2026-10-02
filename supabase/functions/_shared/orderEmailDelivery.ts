import { serviceClient } from './clients.ts'
import {
  merchantNotificationEmail,
  sendCustomerOrderEmail,
  sendMerchantOrderEmail,
  type OrderEmailLine,
  type OrderEmailPayload,
} from './orderEmail.ts'

type AdminClient = ReturnType<typeof serviceClient>

type DeliveryRow = {
  customer_sent_at: string | null
  merchant_sent_at: string | null
  attempts: number
}

export async function deliverPaidOrderEmails(
  admin: AdminClient,
  orderId: string,
): Promise<boolean> {
  const { data: order, error } = await admin
    .from('orders')
    .select('order_number, email, locale, status, shipping_name, shipping_phone, shipping_address, subtotal_cents, discount_cents, shipping_cents, total_cents, promo_code, order_items (product_id, size, variant_label, quantity, unit_price_cents)')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order?.order_number || order.status !== 'paid') {
    throw error ?? new Error('order_email_order_missing')
  }

  const { data: delivery, error: deliveryError } = await admin
    .from('order_email_deliveries')
    .upsert({ order_id: orderId }, { onConflict: 'order_id' })
    .select('customer_sent_at, merchant_sent_at, attempts')
    .maybeSingle()

  if (deliveryError) throw deliveryError

  const state = (delivery ?? {
    customer_sent_at: null,
    merchant_sent_at: null,
    attempts: 0,
  }) as DeliveryRow

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

  const payload: OrderEmailPayload = {
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

  const attempts = Number(state.attempts ?? 0) + 1
  await admin
    .from('order_email_deliveries')
    .update({ attempts, updated_at: new Date().toISOString() })
    .eq('order_id', orderId)

  let customerOk = Boolean(state.customer_sent_at)
  let merchantOk = Boolean(state.merchant_sent_at)
  let lastError = ''

  if (!customerOk) {
    customerOk = await sendCustomerOrderEmail(payload)
    if (customerOk) {
      await admin
        .from('order_email_deliveries')
        .update({ customer_sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
    } else {
      lastError = 'customer_email_failed'
    }
  }

  const merchant = merchantNotificationEmail()
  if (!merchant || merchant === order.email.trim().toLowerCase()) {
    merchantOk = true
  } else if (!merchantOk) {
    merchantOk = await sendMerchantOrderEmail(payload)
    if (merchantOk) {
      await admin
        .from('order_email_deliveries')
        .update({ merchant_sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
    } else {
      lastError = lastError || 'merchant_email_failed'
    }
  }

  if (!customerOk || !merchantOk) {
    await admin
      .from('order_email_deliveries')
      .update({ last_error: lastError || 'order_email_failed', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
  }

  return customerOk && merchantOk
}

export async function retryFailedOrderEmails(admin: AdminClient, limit = 4) {
  const { data: rows, error } = await admin
    .from('order_email_deliveries')
    .select('order_id, customer_sent_at, merchant_sent_at')
    .or('customer_sent_at.is.null,merchant_sent_at.is.null')
    .order('updated_at', { ascending: true })
    .limit(limit)

  if (error || !rows?.length) return 0

  let delivered = 0
  for (const row of rows) {
    try {
      if (await deliverPaidOrderEmails(admin, row.order_id)) delivered += 1
    } catch (error) {
      console.error('order_email_retry_failed', row.order_id, error)
    }
  }
  return delivered
}
