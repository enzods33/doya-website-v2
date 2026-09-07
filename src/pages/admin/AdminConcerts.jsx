import { useEffect, useMemo, useState } from 'react'
import { adminConcerts } from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'

const EMPTY = {
  date: '',
  city: '',
  venue: '',
  country: 'FR',
  ticketing: 'none',
  ticket_url: '',
  published: true,
}

function todayIso() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Affichage JJ/MM/AAAA (stockage ISO inchangé). */
function formatDisplayDate(iso) {
  const raw = String(iso || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return raw || '…'
  return `${match[3]}/${match[2]}/${match[1]}`
}

function AdminConcerts() {
  const { t } = useI18n()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [pastOpen, setPastOpen] = useState(false)
  const today = todayIso()

  async function refresh() {
    const payload = await adminConcerts('list')
    setRows(payload.concerts ?? [])
  }

  useEffect(() => {
    refresh().catch(() => setError(t('admin.error')))
  }, [t])

  const { upcoming, past } = useMemo(() => {
    const up = []
    const gone = []
    for (const row of rows) {
      if ((row.date || '') < today) gone.push(row)
      else up.push(row)
    }
    gone.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    return { upcoming: up, past: gone }
  }, [rows, today])

  function edit(row) {
    setEditingId(row.id)
    setForm({
      date: row.date ?? '',
      city: row.city ?? '',
      venue: row.venue ?? '',
      country: row.country ?? '',
      ticketing: row.ticketing ?? 'none',
      ticket_url: row.ticket_url ?? '',
      published: row.published !== false,
    })
    setOk('')
    setError('')
  }

  function reset() {
    setEditingId(null)
    setForm(EMPTY)
  }

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setOk('')
    try {
      const payload = {
        ...form,
        country: form.country || null,
        ticket_url: form.ticketing === 'link' ? form.ticket_url : null,
      }
      if (editingId) await adminConcerts('update', { id: editingId, ...payload })
      else await adminConcerts('create', payload)
      await refresh()
      reset()
      setOk(t('admin.saved'))
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(id) {
    if (!window.confirm(t('admin.confirmDelete'))) return
    setBusy(true)
    try {
      await adminConcerts('delete', { id })
      await refresh()
      if (editingId === id) reset()
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  async function togglePublished(row) {
    setBusy(true)
    try {
      await adminConcerts('update', {
        id: row.id,
        date: row.date,
        city: row.city,
        venue: row.venue,
        country: row.country,
        ticketing: row.ticketing,
        ticket_url: row.ticket_url,
        published: !row.published,
      })
      await refresh()
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  function ticketingLabel(value) {
    if (value === 'soon') return t('admin.ticketingListSoon')
    if (value === 'link') return t('admin.ticketingListLink')
    return t('admin.ticketingListNone')
  }

  function renderRow(row) {
    const hasTicketLink = row.ticketing === 'link' && row.ticket_url
    const isEditingRow = editingId === row.id
    return (
      <li key={row.id} className={[!row.published ? 'is-hidden' : '', isEditingRow ? 'is-editing-row' : ''].filter(Boolean).join(' ') || undefined}>
        <div>
          <p className="admin-list-title">{formatDisplayDate(row.date)} · {row.city}</p>
          <p className="admin-list-meta">
            {row.venue}{row.country ? ` · ${row.country}` : ''}
          </p>
          <p className="admin-list-meta">
            {ticketingLabel(row.ticketing)}
            {hasTicketLink ? (
              <>
                {' · '}
                <a className="admin-inline-link" href={row.ticket_url} target="_blank" rel="noreferrer">
                  {row.ticket_url}
                </a>
              </>
            ) : null}
          </p>
          <span className={`admin-badge ${row.published ? 'is-live' : 'is-off'}`}>
            {row.published ? t('admin.statusLive') : t('admin.statusHidden')}
          </span>
          {isEditingRow ? <span className="admin-badge is-edit">{t('admin.editingNow')}</span> : null}
        </div>
        <div className="admin-list-actions">
          <button type="button" onClick={() => togglePublished(row)} disabled={busy}>
            {row.published ? t('admin.unpublish') : t('admin.publish')}
          </button>
          <button type="button" onClick={() => edit(row)} disabled={busy}>{t('admin.edit')}</button>
          <button type="button" onClick={() => onDelete(row.id)} disabled={busy}>{t('admin.delete')}</button>
        </div>
      </li>
    )
  }

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.datesTitle')}</h2>
        <p>{t('admin.datesLead')}</p>
      </header>

      <form className={`admin-card admin-form ${editingId ? 'is-editing' : 'is-creating'}`} onSubmit={onSubmit}>
        <div className="admin-form-banner admin-span-2">
          <p className="admin-form-mode">
            {editingId
              ? t('admin.editingDate', { label: `${formatDisplayDate(form.date)}${form.city ? ` · ${form.city}` : ''}` })
              : t('admin.creatingDate')}
          </p>
          {editingId ? (
            <button type="button" className="admin-ghost" onClick={reset}>{t('admin.cancelEdit')}</button>
          ) : null}
        </div>
        <label>
          <span>{t('admin.fieldDate')}</span>
          <input
            className="admin-control"
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <label>
          <span>{t('admin.fieldCity')}</span>
          <input className="admin-control" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </label>
        <label>
          <span>{t('admin.fieldVenue')}</span>
          <input className="admin-control" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
        </label>
        <label>
          <span>{t('admin.fieldCountry')}</span>
          <input
            className="admin-control"
            maxLength={3}
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })}
            placeholder="FR"
          />
        </label>
        <label>
          <span>{t('admin.fieldTicketing')}</span>
          <select className="admin-control" value={form.ticketing} onChange={(e) => setForm({ ...form, ticketing: e.target.value })}>
            <option value="none">{t('admin.ticketingNone')}</option>
            <option value="soon">{t('admin.ticketingSoon')}</option>
            <option value="link">{t('admin.ticketingLink')}</option>
          </select>
        </label>
        {form.ticketing === 'link' ? (
          <label className="admin-span-2">
            <span>{t('admin.fieldTicketUrl')}</span>
            <input
              className="admin-control"
              type="url"
              required
              value={form.ticket_url}
              onChange={(e) => setForm({ ...form, ticket_url: e.target.value })}
              placeholder="https://"
            />
          </label>
        ) : null}
        <label className="admin-switch">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
          <span>{t('admin.fieldPublished')}</span>
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="admin-primary" disabled={busy}>
            {editingId ? t('admin.updateDate') : t('admin.createDate')}
          </button>
          {editingId ? (
            <button type="button" className="admin-secondary" onClick={reset}>{t('admin.cancelEdit')}</button>
          ) : null}
        </div>
      </form>

      {error ? <p className="admin-error">{error}</p> : null}
      {ok ? <p className="admin-ok">{ok}</p> : null}

      <h3 className="admin-subtitle">{t('admin.upcomingDates')}</h3>
      {upcoming.length === 0 ? (
        <p className="admin-empty">{t('admin.noUpcomingDates')}</p>
      ) : (
        <ul className="admin-list">{upcoming.map(renderRow)}</ul>
      )}

      {past.length > 0 ? (
        <div className="admin-collapse">
          <button type="button" className="admin-collapse-toggle" onClick={() => setPastOpen((value) => !value)}>
            {pastOpen ? t('admin.hidePastDates') : t('admin.showPastDates', { count: past.length })}
          </button>
          {pastOpen ? <ul className="admin-list admin-list-past">{past.map(renderRow)}</ul> : null}
        </div>
      ) : null}
    </section>
  )
}

export default AdminConcerts
