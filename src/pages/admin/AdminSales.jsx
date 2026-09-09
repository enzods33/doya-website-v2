import { useEffect, useMemo, useRef, useState } from 'react'
import { adminStats } from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import AdminStatCard from './AdminStatCard.jsx'

function formatEuro(cents, locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100)
}

function formatAddressLines(address) {
  if (!address) return []
  return [
    address.line1,
    address.line2,
    [address.postalCode, address.city].filter(Boolean).join(' '),
    address.state,
    address.country,
  ].map((part) => String(part || '').trim()).filter(Boolean)
}

function AdminSales() {
  const { t, intlLocale } = useI18n()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [filter, setFilter] = useState('to_ship')
  const [openId, setOpenId] = useState(null)
  const [trackingDrafts, setTrackingDrafts] = useState({})
  const [shipBusyId, setShipBusyId] = useState(null)
  const [shipMessage, setShipMessage] = useState('')
  const [stockDrafts, setStockDrafts] = useState({})
  const [stockBusy, setStockBusy] = useState(false)
  const [stockMessage, setStockMessage] = useState('')
  const stockTimersRef = useRef({})
  const inventoryRef = useRef([])

  function syncStockDrafts(inventory) {
    const drafts = {}
    for (const product of inventory ?? []) {
      for (const variant of product.variants ?? []) {
        drafts[variant.variantId] = String(variant.stock)
      }
    }
    setStockDrafts(drafts)
  }

  async function loadSales() {
    setBusy(true)
    setError('')
    try {
      const next = await adminStats('sales')
      setData(next)
      syncStockDrafts(next.inventory)
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadSales()
  }, [t])

  const maxQty = useMemo(
    () => Math.max(1, ...(data?.products ?? []).map((row) => row.quantity)),
    [data],
  )

  const orders = data?.orders ?? []
  const inventory = data?.inventory ?? []
  const filteredOrders = useMemo(() => {
    if (filter === 'shipped') return orders.filter((row) => row.fulfillmentStatus === 'shipped')
    if (filter === 'to_ship') return orders.filter((row) => row.fulfillmentStatus !== 'shipped')
    return orders
  }, [filter, orders])
  useEffect(() => {
    inventoryRef.current = inventory
  }, [inventory])

  function findVariant(variantId) {
    for (const product of inventoryRef.current ?? []) {
      for (const variant of product.variants ?? []) {
        if (variant.variantId === variantId) return variant
      }
    }
    return null
  }

  function scheduleStockSave(variantId, rawValue, delayMs = 900) {
    if (stockTimersRef.current[variantId]) clearTimeout(stockTimersRef.current[variantId])

    const valueSnapshot = rawValue
    stockTimersRef.current[variantId] = window.setTimeout(async () => {
      stockTimersRef.current[variantId] = null

      const meta = findVariant(variantId)
      if (!meta) return

      const trimmed = String(valueSnapshot ?? '').trim()
      if (!trimmed) return

      const nextStock = Number(trimmed)
      if (!Number.isInteger(nextStock) || nextStock < 0) {
        setStockMessage(t('admin.salesStockInvalid'))
        setStockDrafts((current) => ({ ...current, [variantId]: String(meta.stock) }))
        return
      }
      if (nextStock === meta.stock) return
      if (nextStock < meta.reserved) {
        setStockMessage(t('admin.salesStockBelowReserved', { reserved: meta.reserved }))
        setStockDrafts((current) => ({ ...current, [variantId]: String(meta.stock) }))
        return
      }

      setStockMessage('')
      setError('')
      setStockBusy(true)
      try {
        const result = await adminStats('update_stocks', {
          updates: [{ variantId, stock: nextStock }],
        })
        if (result.inventory) {
          setData((current) => (current ? { ...current, inventory: result.inventory } : current))
          syncStockDrafts(result.inventory)
        } else {
          await loadSales()
        }
        setStockMessage(t('admin.salesStockSaved'))
      } catch (caught) {
        const code = caught?.message
        if (code === 'invalid_stock' || code === 'invalid_stock_updates') setStockMessage(t('admin.salesStockInvalid'))
        else if (code === 'stock_below_reserved') setStockMessage(t('admin.salesStockBelowReserved', { reserved: '—' }))
        else setError(t('admin.error'))

        const latest = findVariant(variantId)
        if (latest) setStockDrafts((current) => ({ ...current, [variantId]: String(latest.stock) }))
      } finally {
        setStockBusy(false)
      }
    }, delayMs)
  }
  async function markShipped(order) {
    const trackingNumber = String(trackingDrafts[order.id] ?? '').trim()
    if (!trackingNumber) {
      setShipMessage(t('admin.salesTrackingRequired'))
      setOpenId(order.id)
      return
    }
    setShipBusyId(order.id)
    setShipMessage('')
    setError('')
    try {
      const result = await adminStats('mark_shipped', {
        orderId: order.id,
        trackingNumber,
      })
      setData((current) => {
        if (!current?.orders) return current
        const nextOrders = current.orders.map((row) => (
          row.id === order.id
            ? {
              ...row,
              fulfillmentStatus: 'shipped',
              trackingNumber: result.trackingNumber,
              shippedAt: result.shippedAt,
            }
            : row
        ))
        return {
          ...current,
          orders: nextOrders,
          toShipCount: nextOrders.filter((row) => row.fulfillmentStatus !== 'shipped').length,
          recentOrders: nextOrders.slice(0, 25).map((row) => ({
            id: row.id,
            orderNumber: row.orderNumber,
            email: row.email,
            totalCents: row.totalCents,
            paidAt: row.paidAt,
            fulfillmentStatus: row.fulfillmentStatus,
          })),
        }
      })
      setShipMessage(result.emailSent ? t('admin.salesShippedMailOk') : t('admin.salesShippedMailFail'))
      setTrackingDrafts((current) => {
        const next = { ...current }
        delete next[order.id]
        return next
      })
    } catch (caught) {
      const code = caught?.message
      if (code === 'invalid_tracking') setShipMessage(t('admin.salesTrackingRequired'))
      else if (code === 'already_shipped') setShipMessage(t('admin.salesAlreadyShipped'))
      else setError(t('admin.error'))
    } finally {
      setShipBusyId(null)
    }
  }

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.salesTitle')}</h2>
        <p>{t('admin.salesLead')}</p>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}
      {shipMessage ? <p className="admin-ok" role="status">{shipMessage}</p> : null}
      {stockMessage ? <p className="admin-ok" role="status">{stockMessage}</p> : null}

      <div className="admin-stat-grid" aria-busy={busy || undefined}>
        <AdminStatCard label={t('admin.salesOrders')} value={data?.paidOrders ?? '—'} loading={busy && !data} />
        <AdminStatCard label={t('admin.salesToShip')} value={data?.toShipCount ?? '—'} loading={busy && !data} />
        <AdminStatCard label={t('admin.salesUnits')} value={data?.unitsSold ?? '—'} loading={busy && !data} />
        <AdminStatCard
          label={t('admin.salesRevenue')}
          value={data ? formatEuro(data.revenueCents, intlLocale) : '—'}
          loading={busy && !data}
        />
      </div>

      <div className="admin-sales-toolbar">
        <div>
          <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.salesStockTitle')}</h3>
          <p className="admin-hint">{t('admin.salesStockLead')}</p>
        </div>
      </div>

      {busy && !data ? (
        <div className="admin-list-skeleton" aria-hidden="true">
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line" />
        </div>
      ) : inventory.length === 0 ? (
        <p className="admin-empty">{t('admin.salesStockEmpty')}</p>
      ) : (
        <ul className="admin-stock-list">
          {inventory.map((product) => (
            <li key={product.productId} className="admin-stock-card">
              <div className="admin-stock-head">
                <p className="admin-list-title">{product.name}</p>
                <p className="admin-list-meta">
                  {[product.type, product.color].filter(Boolean).join(' · ')}
                  {product.onSale ? ` · ${t('admin.salesStockOnSale')}` : ''}
                </p>
              </div>
              <div className="admin-stock-grid">
                {product.variants.map((variant) => (
                  <label key={variant.variantId} className="admin-stock-field">
                    <span className="admin-stock-size">
                      {variant.size === 'U' ? t('admin.salesStockUnique') : variant.size}
                    </span>
                    <input
                      className="admin-control"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1}
                      value={stockDrafts[variant.variantId] ?? ''}
                      disabled={stockBusy}
                      aria-label={t('admin.salesStockQtyLabel', {
                        product: product.name,
                        size: variant.size === 'U' ? t('admin.salesStockUnique') : variant.size,
                      })}
                      onChange={(event) => {
                        const nextValue = event.target.value
                        setStockDrafts((current) => ({ ...current, [variant.variantId]: nextValue }))
                        scheduleStockSave(variant.variantId, nextValue, 900)
                      }}
                      onBlur={(event) => {
                        scheduleStockSave(variant.variantId, event.target.value, 0)
                      }}
                    />
                    {variant.reserved > 0 ? (
                      <span className="admin-stock-meta">
                        {t('admin.salesStockReserved', { count: variant.reserved })}
                      </span>
                    ) : (
                      <span className="admin-stock-meta">
                        {t('admin.salesStockAvailable', {
                          count: Math.max(0, Number(stockDrafts[variant.variantId]) || 0),
                        })}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="admin-sales-toolbar">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.salesHistory')}</h3>
        <div className="admin-sales-filters" role="group" aria-label={t('admin.salesFilterAria')}>
          {[
            ['to_ship', t('admin.salesFilterToShip')],
            ['shipped', t('admin.salesFilterShipped')],
            ['all', t('admin.salesFilterAll')],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="admin-sales-filter"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {busy && !data ? (
        <div className="admin-list-skeleton" aria-hidden="true">
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line is-short" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <p className="admin-empty">{t('admin.salesEmptyFilter')}</p>
      ) : (
        <ul className="admin-order-list">
          {filteredOrders.map((order) => {
            const open = openId === order.id
            const addressLines = formatAddressLines(order.shippingAddress)
            const shipped = order.fulfillmentStatus === 'shipped'
            return (
              <li key={order.id} className={`admin-order-card${shipped ? ' is-shipped' : ' is-to-ship'}`}>
                <button
                  type="button"
                  className="admin-order-toggle"
                  aria-expanded={open}
                  onClick={() => setOpenId((current) => (current === order.id ? null : order.id))}
                >
                  <div>
                    <p className="admin-list-title">{order.orderNumber}</p>
                    <p className="admin-list-meta">
                      {order.shippingName || order.email}
                      {' · '}
                      {formatEuro(order.totalCents, intlLocale)}
                      {order.paidAt ? ` · ${new Date(order.paidAt).toLocaleString(intlLocale)}` : ''}
                    </p>
                  </div>
                  <span className={`admin-fulfillment-badge is-${shipped ? 'shipped' : 'to-ship'}`}>
                    {shipped ? t('admin.salesStatusShipped') : t('admin.salesStatusToShip')}
                  </span>
                </button>

                {open ? (
                  <div className="admin-order-detail">
                    <div className="admin-order-grid">
                      <div>
                        <p className="admin-order-label">{t('admin.salesShipTo')}</p>
                        <p className="admin-order-value">{order.shippingName || '—'}</p>
                        <p className="admin-order-value">{order.email}</p>
                        {order.shippingPhone ? <p className="admin-order-value">{order.shippingPhone}</p> : null}
                        {addressLines.length ? (
                          <p className="admin-order-address">
                            {addressLines.map((line) => (
                              <span key={line}>{line}</span>
                            ))}
                          </p>
                        ) : (
                          <p className="admin-order-value">{t('admin.salesNoAddress')}</p>
                        )}
                      </div>
                      <div>
                        <p className="admin-order-label">{t('admin.salesItems')}</p>
                        <ul className="admin-order-lines">
                          {order.lines.map((line) => (
                            <li key={`${line.productId}-${line.size}`}>
                              {line.quantity} × {line.name}
                              {line.size === 'U' ? '' : ` · ${line.size}`}
                              {' · '}
                              {formatEuro(line.unitPriceCents * line.quantity, intlLocale)}
                            </li>
                          ))}
                        </ul>
                        <p className="admin-order-value">
                          {t('admin.salesTotal')} · {formatEuro(order.totalCents, intlLocale)}
                          {order.promoCode ? ` · ${order.promoCode}` : ''}
                        </p>
                      </div>
                    </div>

                    {shipped ? (
                      <div className="admin-order-shipped">
                        <p className="admin-order-label">{t('admin.salesTracking')}</p>
                        <p className="admin-order-value"><strong>{order.trackingNumber}</strong></p>
                        {order.shippedAt ? (
                          <p className="admin-list-meta">
                            {t('admin.salesShippedAt', {
                              date: new Date(order.shippedAt).toLocaleString(intlLocale),
                            })}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="admin-order-ship-form">
                        <label className="admin-order-tracking-field">
                          <span>{t('admin.salesTracking')}</span>
                          <input
                            className="admin-control"
                            type="text"
                            autoComplete="off"
                            spellCheck="false"
                            value={trackingDrafts[order.id] ?? ''}
                            disabled={shipBusyId === order.id}
                            placeholder={t('admin.salesTrackingPlaceholder')}
                            onChange={(event) => setTrackingDrafts((current) => ({
                              ...current,
                              [order.id]: event.target.value,
                            }))}
                          />
                        </label>
                        <button
                          type="button"
                          className="admin-primary"
                          disabled={shipBusyId === order.id}
                          onClick={() => markShipped(order)}
                        >
                          {shipBusyId === order.id ? t('admin.saving') : t('admin.salesMarkShipped')}
                        </button>
                        <p className="admin-hint">{t('admin.salesMarkShippedHelp')}</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.salesByProduct')}</h3>
      {busy && !data ? (
        <div className="admin-list-skeleton" aria-hidden="true">
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line" />
        </div>
      ) : (data?.products ?? []).length === 0 ? (
        <p className="admin-empty">{t('admin.salesEmpty')}</p>
      ) : (
        <ul className="admin-sales-list">
          {data.products.map((row) => (
            <li key={row.productId}>
              <div className="admin-sales-row">
                <div>
                  <p className="admin-list-title">{row.name}</p>
                  <p className="admin-list-meta">
                    {[row.type, row.color].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="admin-sales-figures">
                  <span>{t('admin.salesSoldCount', { count: row.quantity })}</span>
                  <strong>{formatEuro(row.revenueCents, intlLocale)}</strong>
                </div>
              </div>
              <div className="admin-sales-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((row.quantity / maxQty) * 100)}%` }} />
              </div>
              {Object.entries(row.sizes || {}).some(([size]) => size !== 'U') ? (
                <p className="admin-sales-sizes">
                  {Object.entries(row.sizes)
                    .filter(([size]) => size !== 'U')
                    .sort((a, b) => b[1] - a[1])
                    .map(([size, qty]) => `${size} × ${qty}`)
                    .join(' · ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminSales
