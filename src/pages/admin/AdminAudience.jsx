import { useEffect, useMemo, useRef, useState } from 'react'
import { adminStats } from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'

function normalizePath(path) {
  let value = String(path || '/').trim().toLowerCase()
  if (!value || value === '/#top') return '/'
  return value
}

/** Libellés = mêmes noms que la nav du site. */
function pageLabel(path, t) {
  switch (normalizePath(path)) {
    case '/':
      return t('a11y.home')
    case '/#music':
      return t('nav.music')
    case '/#live':
      return t('nav.live')
    case '/#shop':
      return t('nav.shop')
    case '/#about':
      return t('nav.about')
    case '/#contact':
      return t('nav.contact')
    case '/panier':
      return t('nav.cart')
    case '/commande':
      return t('order.title')
    default:
      return normalizePath(path)
  }
}

function AdminAudience() {
  const { t, intlLocale } = useI18n()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const barsRef = useRef(null)

  useEffect(() => {
    setBusy(true)
    adminStats('audience')
      .then(setData)
      .catch(() => setError(t('admin.error')))
      .finally(() => setBusy(false))
  }, [t])

  useEffect(() => {
    const el = barsRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth
  }, [data])

  const topPages = useMemo(() => {
    const merged = new Map()
    for (const row of data?.topPages ?? []) {
      const label = pageLabel(row.path, t)
      merged.set(label, (merged.get(label) ?? 0) + Number(row.views || 0))
    }
    return [...merged.entries()]
      .map(([label, views]) => ({ label, views }))
      .sort((a, b) => b.views - a.views)
  }, [data, t])

  const maxDay = useMemo(
    () => Math.max(1, ...(data?.daily ?? []).map((row) => row.views)),
    [data],
  )
  const maxPage = useMemo(
    () => Math.max(1, ...topPages.map((row) => row.views)),
    [topPages],
  )

  function scrollBars(direction) {
    const el = barsRef.current
    if (!el) return
    const step = Math.max(el.clientWidth * 0.7, 180)
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  if (busy) return <p className="admin-status">{t('admin.loading')}</p>
  if (error) return <p className="admin-error">{error}</p>
  if (!data) return null

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.audienceTitle')}</h2>
      </header>

      <div className="admin-stat-grid">
        <article className="admin-stat-card">
          <p className="admin-stat-label">{t('admin.audienceToday')}</p>
          <p className="admin-stat-value">{data.todayViews}</p>
        </article>
        <article className="admin-stat-card">
          <p className="admin-stat-label">{t('admin.audienceDays')}</p>
          <p className="admin-stat-value">{data.totalViews}</p>
        </article>
      </div>

      <div className="admin-chart-head">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.audienceDaily')}</h3>
        <div className="admin-chart-nav">
          <button type="button" className="admin-chart-nav-btn" onClick={() => scrollBars(-1)} aria-label={t('admin.audienceOlder')}>
            ←
          </button>
          <button type="button" className="admin-chart-nav-btn" onClick={() => scrollBars(1)} aria-label={t('admin.audienceNewer')}>
            →
          </button>
        </div>
      </div>
      <p className="admin-chart-hint">{t('admin.audienceScrollHint')}</p>
      <div
        className="admin-bars-scroller"
        ref={barsRef}
        role="img"
        aria-label={t('admin.audienceDaily')}
      >
        <div className="admin-bars">
          {(data.daily ?? []).map((row) => {
            const label = new Intl.DateTimeFormat(intlLocale, { weekday: 'short', day: 'numeric' }).format(new Date(`${row.day}T12:00:00Z`))
            return (
              <div key={row.day} className="admin-bar-col" title={`${label}: ${row.views}`}>
                <div className="admin-bar-track">
                  <span style={{ height: `${Math.round((row.views / maxDay) * 100)}%` }} />
                </div>
                <span className="admin-bar-label">{label}</span>
                <span className="admin-bar-count">{row.views}</span>
              </div>
            )
          })}
        </div>
      </div>

      <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.audienceTopPages')}</h3>
      {topPages.length === 0 ? (
        <p className="admin-empty">{t('admin.audienceEmpty')}</p>
      ) : (
        <ul className="admin-sales-list">
          {topPages.map((row) => (
            <li key={row.label}>
              <div className="admin-sales-row">
                <p className="admin-list-title">{row.label}</p>
                <strong>{row.views}</strong>
              </div>
              <div className="admin-sales-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((row.views / maxPage) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminAudience
