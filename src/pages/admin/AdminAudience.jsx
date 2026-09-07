import { useEffect, useMemo, useRef, useState } from 'react'
import { adminStats } from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import AdminStatCard from './AdminStatCard.jsx'

const PERIODS = [
  { days: 7, labelKey: 'admin.audiencePeriod7' },
  { days: 30, labelKey: 'admin.audiencePeriod30' },
  { days: 90, labelKey: 'admin.audiencePeriod90' },
  { days: 365, labelKey: 'admin.audiencePeriod365' },
]

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

function actionLabel(event, place, t) {
  const eventKey = `admin.event.${event}`
  const placeKey = `admin.place.${place}`
  const eventText = t(eventKey)
  const placeText = t(placeKey)
  const eventSafe = eventText === eventKey ? event : eventText
  const placeSafe = placeText === placeKey ? place : placeText
  return `${eventSafe} · ${placeSafe}`
}

function AdminAudience() {
  const { t, intlLocale } = useI18n()
  const [periodDays, setPeriodDays] = useState(90)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const barsRef = useRef(null)

  useEffect(() => {
    setBusy(true)
    setError('')
    adminStats('audience', { days: periodDays })
      .then(setData)
      .catch(() => setError(t('admin.error')))
      .finally(() => setBusy(false))
  }, [t, periodDays])

  useEffect(() => {
    const el = barsRef.current
    if (!el || !data) return
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

  const topActions = useMemo(() => {
    return (data?.topActions ?? []).map((row) => ({
      key: `${row.event}|${row.place}`,
      label: actionLabel(row.event, row.place, t),
      count: Number(row.count || 0),
    }))
  }, [data, t])

  const maxDay = useMemo(
    () => Math.max(1, ...(data?.daily ?? []).map((row) => row.views)),
    [data],
  )
  const maxPage = useMemo(
    () => Math.max(1, ...topPages.map((row) => row.views)),
    [topPages],
  )
  const maxAction = useMemo(
    () => Math.max(1, ...topActions.map((row) => row.count)),
    [topActions],
  )

  const periodLabelKey = PERIODS.find((row) => row.days === periodDays)?.labelKey
    ?? 'admin.audiencePeriod90'

  function scrollBars(direction) {
    const el = barsRef.current
    if (!el) return
    const step = Math.max(el.clientWidth * 0.7, 180)
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.audienceTitle')}</h2>
      </header>

      <div className="admin-period-nav" role="group" aria-label={t('admin.audiencePeriod')}>
        {PERIODS.map((period) => (
          <button
            key={period.days}
            type="button"
            className={`admin-period-btn${periodDays === period.days ? ' is-active' : ''}`}
            aria-pressed={periodDays === period.days}
            disabled={busy}
            onClick={() => setPeriodDays(period.days)}
          >
            {t(period.labelKey)}
          </button>
        ))}
      </div>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-stat-grid" aria-busy={busy || undefined}>
        <AdminStatCard label={t('admin.audienceToday')} value={data?.todayViews ?? '—'} loading={busy && !data} />
        <AdminStatCard
          label={t('admin.audienceDays', { period: t(periodLabelKey) })}
          value={data?.totalViews ?? '—'}
          loading={busy && !data}
        />
      </div>

      <div className="admin-chart-head">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.audienceDaily')}</h3>
        <div className="admin-chart-nav">
          <button type="button" className="admin-chart-nav-btn" disabled={busy || !data} onClick={() => scrollBars(-1)} aria-label={t('admin.audienceOlder')}>
            ←
          </button>
          <button type="button" className="admin-chart-nav-btn" disabled={busy || !data} onClick={() => scrollBars(1)} aria-label={t('admin.audienceNewer')}>
            →
          </button>
        </div>
      </div>
      <p className="admin-chart-hint">{t('admin.audienceScrollHint')}</p>
      {busy && !data ? (
        <div className="admin-bars-skeleton" aria-hidden="true" />
      ) : (
        <div
          className="admin-bars-scroller"
          ref={barsRef}
          role="img"
          aria-label={t('admin.audienceDaily')}
        >
          <div className="admin-bars">
            {(data?.daily ?? []).map((row) => {
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
      )}

      <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.audienceTopPages')}</h3>
      {busy && !data ? (
        <div className="admin-list-skeleton" aria-hidden="true">
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line is-short" />
        </div>
      ) : topPages.length === 0 ? (
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

      <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.audienceTopActions')}</h3>
      {busy && !data ? (
        <div className="admin-list-skeleton" aria-hidden="true">
          <div className="admin-skeleton-line" />
          <div className="admin-skeleton-line" />
        </div>
      ) : topActions.length === 0 ? (
        <p className="admin-empty">{t('admin.audienceActionsEmpty')}</p>
      ) : (
        <ul className="admin-sales-list">
          {topActions.map((row) => (
            <li key={row.key}>
              <div className="admin-sales-row">
                <p className="admin-list-title">{row.label}</p>
                <strong>{row.count}</strong>
              </div>
              <div className="admin-sales-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((row.count / maxAction) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminAudience
