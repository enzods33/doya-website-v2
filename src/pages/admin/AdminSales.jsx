import { useEffect, useMemo, useState } from 'react'
import { adminStats } from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'

function formatEuro(cents, locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100)
}

function AdminSales() {
  const { t, intlLocale } = useI18n()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    setBusy(true)
    adminStats('sales')
      .then(setData)
      .catch(() => setError(t('admin.error')))
      .finally(() => setBusy(false))
  }, [t])

  const maxQty = useMemo(
    () => Math.max(1, ...(data?.products ?? []).map((row) => row.quantity)),
    [data],
  )

  if (busy) return <p className="admin-status">{t('admin.loading')}</p>
  if (error) return <p className="admin-error">{error}</p>
  if (!data) return null

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.salesTitle')}</h2>
        <p>{t('admin.salesLead')}</p>
      </header>

      <div className="admin-stat-grid">
        <article className="admin-stat-card">
          <p className="admin-stat-label">{t('admin.salesOrders')}</p>
          <p className="admin-stat-value">{data.paidOrders}</p>
        </article>
        <article className="admin-stat-card">
          <p className="admin-stat-label">{t('admin.salesUnits')}</p>
          <p className="admin-stat-value">{data.unitsSold}</p>
        </article>
        <article className="admin-stat-card">
          <p className="admin-stat-label">{t('admin.salesRevenue')}</p>
          <p className="admin-stat-value">{formatEuro(data.revenueCents, intlLocale)}</p>
        </article>
      </div>

      <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.salesRecent')}</h3>
      {(data.recentOrders ?? []).length === 0 ? (
        <p className="admin-empty">{t('admin.salesEmpty')}</p>
      ) : (
        <ul className="admin-list">
          {(data.recentOrders ?? []).map((row) => (
            <li key={row.id}>
              <p className="admin-list-title">{row.orderNumber}</p>
              <p className="admin-list-meta">
                {row.email}
                {' · '}
                {formatEuro(row.totalCents, intlLocale)}
                {row.paidAt ? ` · ${new Date(row.paidAt).toLocaleString(intlLocale)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.salesByProduct')}</h3>
      {(data.products ?? []).length === 0 ? (
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
