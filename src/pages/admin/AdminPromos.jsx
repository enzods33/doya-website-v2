import { useEffect, useMemo, useState } from 'react'
import { adminStats } from '../../commerce/admin.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'

function formatEuro(cents, locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100)
}

function eurosToCents(value) {
  const normalized = String(value ?? '').trim().replace(',', '.')
  if (!normalized) return null
  const euros = Number(normalized)
  if (!Number.isFinite(euros) || euros < 0) return null
  return Math.round(euros * 100)
}

function centsToEurosInput(cents) {
  if (!Number.isInteger(cents)) return ''
  return (cents / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function generatePromoCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `DOYA-${suffix}`
}

function startOfDayIso(dateValue) {
  if (!dateValue) return null
  const parsed = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function endOfDayIso(dateValue) {
  if (!dateValue) return null
  const parsed = new Date(`${dateValue}T23:59:59.999`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function emptyPromoForm() {
  return {
    code: '',
    amount: '',
    maxRedemptions: '',
    startsAt: '',
    endsAt: '',
    active: true,
  }
}

function autoRuleLabel(promo, t) {
  const tees = Number(promo.minTeeQty) || 0
  const cds = Number(promo.minCdQty) || 0
  if (tees >= 2 && cds <= 0) return t('admin.promoAutoRuleTees')
  if (tees >= 1 && cds >= 1) return t('admin.promoAutoRuleCdTee')
  return t('admin.promoAuto')
}

function AdminPromos() {
  const { t, intlLocale } = useI18n()
  const [promos, setPromos] = useState([])
  const [busy, setBusy] = useState(true)
  const [promoBusy, setPromoBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [promoForm, setPromoForm] = useState(emptyPromoForm)
  const [amountDrafts, setAmountDrafts] = useState({})

  const autoPromos = useMemo(() => promos.filter((row) => row.autoApply), [promos])
  const manualPromos = useMemo(() => promos.filter((row) => !row.autoApply), [promos])

  function syncAmountDrafts(list) {
    const drafts = {}
    for (const promo of list ?? []) {
      if (promo.amountOffCents != null) drafts[promo.id] = centsToEurosInput(promo.amountOffCents)
    }
    setAmountDrafts(drafts)
  }

  async function loadPromos() {
    setBusy(true)
    setError('')
    try {
      const payload = await adminStats('list_promos')
      const next = payload.promos ?? []
      setPromos(next)
      syncAmountDrafts(next)
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadPromos()
  }, [t])

  async function createPromo() {
    const code = String(promoForm.code || '').trim().toUpperCase().replace(/\s+/g, '')
    const amountOffCents = eurosToCents(promoForm.amount)
    if (!code || code.length < 3) {
      setMessage(t('admin.promoCodeInvalid'))
      return
    }
    if (amountOffCents == null || amountOffCents < 50) {
      setMessage(t('admin.promoAmountInvalid'))
      return
    }
    let maxRedemptions = null
    if (String(promoForm.maxRedemptions || '').trim()) {
      const max = Number(promoForm.maxRedemptions)
      if (!Number.isInteger(max) || max < 1) {
        setMessage(t('admin.promoCapInvalid'))
        return
      }
      maxRedemptions = max
    }

    const startsAt = startOfDayIso(promoForm.startsAt)
    const endsAt = endOfDayIso(promoForm.endsAt)
    if (promoForm.startsAt && !startsAt) {
      setMessage(t('admin.promoStartsInvalid'))
      return
    }
    if (promoForm.endsAt && !endsAt) {
      setMessage(t('admin.promoEndsInvalid'))
      return
    }
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      setMessage(t('admin.promoRangeInvalid'))
      return
    }

    setPromoBusy(true)
    setMessage('')
    setError('')
    try {
      const result = await adminStats('create_promo', {
        promo: {
          code,
          amountOffCents,
          maxRedemptions,
          startsAt,
          endsAt,
          active: promoForm.active,
          onePerCustomer: true,
        },
      })
      const next = [result.promo, ...promos]
      setPromos(next)
      syncAmountDrafts(next)
      setPromoForm(emptyPromoForm())
      setMessage(t('admin.promoCreated', { code: result.promo.code }))
    } catch (caught) {
      const codeErr = caught?.message
      if (codeErr === 'promo_exists') setMessage(t('admin.promoExists'))
      else if (codeErr === 'invalid_promo_code') setMessage(t('admin.promoCodeInvalid'))
      else if (codeErr === 'invalid_promo_ends' || codeErr === 'invalid_promo_starts') {
        setMessage(t('admin.promoEndsInvalid'))
      } else setError(t('admin.error'))
    } finally {
      setPromoBusy(false)
    }
  }

  async function togglePromo(promo) {
    setPromoBusy(true)
    setMessage('')
    try {
      const result = await adminStats('update_promo', {
        promoId: promo.id,
        active: !promo.active,
      })
      setPromos(result.promos ?? [])
      syncAmountDrafts(result.promos ?? [])
      setMessage(t('admin.promoUpdated'))
    } catch {
      setError(t('admin.error'))
    } finally {
      setPromoBusy(false)
    }
  }

  async function saveAmount(promo) {
    const amountOffCents = eurosToCents(amountDrafts[promo.id])
    if (amountOffCents == null || amountOffCents < 50) {
      setMessage(t('admin.promoAmountInvalid'))
      setAmountDrafts((current) => ({ ...current, [promo.id]: centsToEurosInput(promo.amountOffCents) }))
      return
    }
    if (amountOffCents === promo.amountOffCents) return

    setPromoBusy(true)
    setMessage('')
    try {
      const result = await adminStats('update_promo', {
        promoId: promo.id,
        amountOffCents,
      })
      setPromos(result.promos ?? [])
      syncAmountDrafts(result.promos ?? [])
      setMessage(t('admin.promoAmountSaved'))
    } catch {
      setError(t('admin.error'))
      setAmountDrafts((current) => ({ ...current, [promo.id]: centsToEurosInput(promo.amountOffCents) }))
    } finally {
      setPromoBusy(false)
    }
  }

  async function copyPromo(code) {
    try {
      await navigator.clipboard.writeText(code)
      setMessage(t('admin.promoCopied', { code }))
    } catch {
      setMessage(t('admin.promoCopyFail'))
    }
  }

  function formatValidity(promo) {
    const start = promo.startsAt ? new Date(promo.startsAt).toLocaleDateString(intlLocale) : null
    const end = promo.endsAt ? new Date(promo.endsAt).toLocaleDateString(intlLocale) : null
    if (start && end) return t('admin.promoValidityRange', { start, end })
    if (end) return t('admin.promoValidityUntil', { end })
    if (start) return t('admin.promoValidityFrom', { start })
    return t('admin.promoValidityNone')
  }

  return (
    <section className="admin-section admin-promos">
      <header className="admin-section-head">
        <h2>{t('admin.promoTitle')}</h2>
        <p>{t('admin.promoLead')}</p>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}
      {message ? <p className="admin-ok" role="status">{message}</p> : null}

      <div className="admin-promo-block">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.promoAutoTitle')}</h3>
        <p className="admin-hint">{t('admin.promoAutoHelp')}</p>
        {busy ? (
          <div className="admin-list-skeleton" aria-hidden="true">
            <div className="admin-skeleton-line" />
            <div className="admin-skeleton-line" />
          </div>
        ) : autoPromos.length === 0 ? (
          <p className="admin-empty">{t('admin.promoAutoEmpty')}</p>
        ) : (
          <ul className="admin-promo-rules">
            {autoPromos.map((promo) => (
              <li key={promo.id} className={`admin-promo-rule${promo.active ? '' : ' is-off'}`}>
                <div className="admin-promo-rule-copy">
                  <p className="admin-list-title">{autoRuleLabel(promo, t)}</p>
                  <p className="admin-list-meta">
                    {t('admin.promoAutoNoCode')}
                    {promo.active ? '' : ` · ${t('admin.promoInactive')}`}
                  </p>
                </div>
                <div className="admin-promo-rule-tools">
                  <label className="admin-promo-amount">
                    <span>{t('admin.promoAmount')}</span>
                    <span className="admin-promo-amount-input">
                      <input
                        className="admin-control"
                        type="text"
                        inputMode="decimal"
                        value={amountDrafts[promo.id] ?? ''}
                        disabled={promoBusy || !promo.active}
                        onChange={(event) => setAmountDrafts((current) => ({
                          ...current,
                          [promo.id]: event.target.value,
                        }))}
                        onBlur={() => saveAmount(promo)}
                      />
                      <span aria-hidden="true">€</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    className={`admin-promo-toggle${promo.active ? ' is-on' : ''}`}
                    disabled={promoBusy}
                    aria-pressed={promo.active}
                    onClick={() => togglePromo(promo)}
                  >
                    {promo.active ? t('admin.promoDisable') : t('admin.promoEnable')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-promo-block">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.promoManualTitle')}</h3>
        <p className="admin-hint">{t('admin.promoManualHelp')}</p>

        <div className="admin-form admin-promo-create">
          <label className="admin-span-2">
            <span>{t('admin.promoCode')}</span>
            <div className="admin-promo-code-row">
              <input
                className="admin-control"
                value={promoForm.code}
                disabled={promoBusy}
                placeholder="DOYA-XXXX"
                onChange={(event) => setPromoForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              />
              <button
                type="button"
                className="admin-secondary"
                disabled={promoBusy}
                onClick={() => setPromoForm((current) => ({ ...current, code: generatePromoCode() }))}
              >
                {t('admin.promoGenerate')}
              </button>
            </div>
          </label>
          <label>
            <span>{t('admin.promoAmount')}</span>
            <input
              className="admin-control"
              type="text"
              inputMode="decimal"
              value={promoForm.amount}
              disabled={promoBusy}
              placeholder="5"
              onChange={(event) => setPromoForm((current) => ({ ...current, amount: event.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.promoCap')}</span>
            <input
              className="admin-control"
              type="number"
              min={1}
              value={promoForm.maxRedemptions}
              disabled={promoBusy}
              placeholder={t('admin.promoCapUnlimited')}
              onChange={(event) => setPromoForm((current) => ({ ...current, maxRedemptions: event.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.promoStarts')}</span>
            <input
              className="admin-control"
              type="date"
              value={promoForm.startsAt}
              disabled={promoBusy}
              onChange={(event) => setPromoForm((current) => ({ ...current, startsAt: event.target.value }))}
            />
          </label>
          <label>
            <span>{t('admin.promoEnds')}</span>
            <input
              className="admin-control"
              type="date"
              value={promoForm.endsAt}
              disabled={promoBusy}
              onChange={(event) => setPromoForm((current) => ({ ...current, endsAt: event.target.value }))}
            />
          </label>
          <div className="admin-span-2 admin-promo-create-foot">
            <p className="admin-hint">{t('admin.promoDatesHelp')}</p>
            <label className="admin-check admin-check-inline">
              <input
                type="checkbox"
                checked={promoForm.active}
                disabled={promoBusy}
                onChange={(event) => setPromoForm((current) => ({ ...current, active: event.target.checked }))}
              />
              <span>{t('admin.promoActive')}</span>
            </label>
            <button type="button" className="admin-primary" disabled={promoBusy || busy} onClick={createPromo}>
              {promoBusy ? t('admin.saving') : t('admin.promoCreate')}
            </button>
          </div>
        </div>

        {busy ? null : manualPromos.length === 0 ? (
          <p className="admin-empty">{t('admin.promoEmpty')}</p>
        ) : (
          <ul className="admin-promo-rules">
            {manualPromos.map((promo) => (
              <li key={promo.id} className={`admin-promo-rule${promo.active ? '' : ' is-off'}`}>
                <div className="admin-promo-rule-copy">
                  <p className="admin-list-title">{promo.code}</p>
                  <p className="admin-list-meta">
                    {promo.amountOffCents != null
                      ? formatEuro(promo.amountOffCents, intlLocale)
                      : `${promo.percentOff} %`}
                    {' · '}
                    {t('admin.promoUses', { used: promo.redeemed, held: promo.held })}
                    {promo.maxRedemptions != null ? ` / ${promo.maxRedemptions}` : ''}
                    {promo.active ? '' : ` · ${t('admin.promoInactive')}`}
                  </p>
                  <p className="admin-list-meta">{formatValidity(promo)}</p>
                </div>
                <div className="admin-promo-rule-tools">
                  <label className="admin-promo-amount">
                    <span>{t('admin.promoAmount')}</span>
                    <span className="admin-promo-amount-input">
                      <input
                        className="admin-control"
                        type="text"
                        inputMode="decimal"
                        value={amountDrafts[promo.id] ?? ''}
                        disabled={promoBusy}
                        onChange={(event) => setAmountDrafts((current) => ({
                          ...current,
                          [promo.id]: event.target.value,
                        }))}
                        onBlur={() => saveAmount(promo)}
                      />
                      <span aria-hidden="true">€</span>
                    </span>
                  </label>
                  <div className="admin-promo-rule-buttons">
                    <button type="button" className="admin-secondary" onClick={() => copyPromo(promo.code)}>
                      {t('admin.promoCopy')}
                    </button>
                    <button
                      type="button"
                      className={`admin-promo-toggle${promo.active ? ' is-on' : ''}`}
                      disabled={promoBusy}
                      aria-pressed={promo.active}
                      onClick={() => togglePromo(promo)}
                    >
                      {promo.active ? t('admin.promoDisable') : t('admin.promoEnable')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default AdminPromos
