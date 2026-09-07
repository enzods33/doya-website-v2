import { useEffect, useMemo, useState } from 'react'
import { adminStats } from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import AdminStatCard from './AdminStatCard.jsx'

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
    setError('')
    adminStats('sales')
      .then(setData)
      .catch(() => setError(t('admin.error')))
      .finally(() => setBusy(false))
  }, [t])

  const maxQty = useMemo(
    () => Math.max(1, ...(data?.products ?? []).map((row) => row.quantity)),
    [data],
  )

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.salesTitle')}</h2>
        <p>{t('admin.salesLead')}</p>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-stat-grid" aria-busy={busy || undefined}>
        <AdminStatCard label={t('admin.salesOrders')} value={data?.paidOrders ?? '—'} loading={busy && !data} />
        <AdminStatCard label={t('admin.salesUnits')} value={data?.unitsSold ?? '—'} loading={busy && !data} />
        <AdminStatCard
          label={t('admin.salesRevenue')}
          value={data ? formatEuro(data.revenueCents, intlLocale) : '—'}
          loading={busy && !data}
        />
      </div>

      <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.salesRecent')}</h3>
      {busy && !data ? (
        <div className="admin-list-skeleton" aria-hidden="true">
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line is-short" />
        </div>
      ) : (data?.recentOrders ?? []).length === 0 ? (
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
