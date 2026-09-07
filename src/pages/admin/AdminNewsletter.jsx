import { useEffect, useMemo, useState } from 'react'
import { adminBrevo } from '../../commerce/admin.js'
import {
  DEFAULT_NEWSLETTER_SIGNATURE,
  EMAIL_LOGO_PUBLIC_URL,
  buildNewsletterHtml,
  resolvePreviewText,
} from '../../commerce/newsletterHtml.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import AdminStatCard from './AdminStatCard.jsx'

const STORAGE_SIGNATURE = 'doya-newsletter-signature'

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value == null || value === '' ? fallback : value
  } catch {
    return fallback
  }
}

function AdminNewsletter() {
  const { t } = useI18n()
  const [campaigns, setCampaigns] = useState([])
  const [subscribers, setSubscribers] = useState(null)
  const [langStats, setLangStats] = useState(null)
  const [statsBusy, setStatsBusy] = useState(true)
  const [subject, setSubject] = useState('')
  const [signature, setSignature] = useState(DEFAULT_NEWSLETTER_SIGNATURE)
  const [bodyText, setBodyText] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('18:00')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [sentModal, setSentModal] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [campaignPreview, setCampaignPreview] = useState(null)
  const [sendLang, setSendLang] = useState('fr')

  useEffect(() => {
    setSignature(readStored(STORAGE_SIGNATURE, DEFAULT_NEWSLETTER_SIGNATURE))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIGNATURE, signature)
    } catch {
      /* private mode */
    }
  }, [signature])

  const previewLogoBase = typeof window !== 'undefined' ? window.location.origin : ''
  const previewOptions = useMemo(
    () => ({ signature, logoBase: previewLogoBase }),
    [signature, previewLogoBase],
  )
  const sendOptions = useMemo(
    () => ({ signature, logoUrl: EMAIL_LOGO_PUBLIC_URL }),
    [signature],
  )
  const previewHtml = useMemo(
    () => buildNewsletterHtml(bodyText || t('admin.newsletterPreviewPlaceholder'), previewOptions),
    [bodyText, previewOptions, t],
  )
  const effectivePreview = useMemo(
    () => resolvePreviewText('', bodyText) || t('admin.newsletterPreviewPlaceholder'),
    [bodyText, t],
  )

  const latestCampaign = campaigns[0] ?? null
  const olderCampaigns = campaigns.slice(1)

  function campaignWhen(campaign) {
    return campaign?.sentDate || campaign?.scheduledAt || campaign?.createdAt || ''
  }

  /** Affichage JJ/MM/AAAA HH:mm */
  function formatCampaignDateTime(iso) {
    const raw = String(iso || '').trim()
    if (!raw) return ''
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const yyyy = date.getFullYear()
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`
  }

  function campaignStatusLabel(campaign) {
    const status = String(campaign.status || '')
    if (status === 'sent') return t('admin.campaignStatusSent')
    if (status === 'queued') return t('admin.campaignStatusQueued')
    if (status === 'scheduled') return t('admin.campaignStatusScheduled')
    if (status === 'draft') return t('admin.campaignStatusDraft')
    const tag = String(campaign.tag || '')
    if (tag === 'doya-immediate' || /\bimmediat/i.test(String(campaign.name || ''))) {
      return t('admin.campaignStatusImmediate')
    }
    return status || t('admin.campaignStatusUnknown')
  }

  async function refresh({ soft = false } = {}) {
    if (!soft) setStatsBusy(true)
    try {
      const payload = await adminBrevo('list')
      const rows = [...(payload.campaigns ?? [])].sort((a, b) => {
        const ta = Date.parse(campaignWhen(a) || '') || 0
        const tb = Date.parse(campaignWhen(b) || '') || 0
        return tb - ta
      })
      setCampaigns(rows)
      setSubscribers(typeof payload.subscribers === 'number' ? payload.subscribers : null)
      setLangStats(payload.langStats && typeof payload.langStats === 'object' ? payload.langStats : null)
    } finally {
      setStatsBusy(false)
    }
  }

  useEffect(() => {
    refresh().catch(() => {
      setError(t('admin.error'))
      setStatsBusy(false)
    })
  }, [t])

  async function openCampaignPreview(campaign) {
    if (!campaign?.id || previewBusy) return
    setPreviewBusy(true)
    setError('')
    try {
      const payload = await adminBrevo('get', { campaignId: campaign.id })
      setCampaignPreview(payload.campaign ?? null)
    } catch {
      setError(t('admin.error'))
    } finally {
      setPreviewBusy(false)
    }
  }
  async function submit(mode) {
    setBusy(true)
    setError('')
    setOk('')
    setSentModal(null)
    try {
      const payload = {
        subject,
        bodyText,
        signature,
        previewText: resolvePreviewText('', bodyText),
        htmlContent: buildNewsletterHtml(bodyText, sendOptions),
        logoUrl: EMAIL_LOGO_PUBLIC_URL,
        lang: sendLang,
      }
      if (mode === 'schedule') {
        if (!scheduleDate || !scheduleTime) throw new Error('invalid_schedule')
        const local = new Date(`${scheduleDate}T${scheduleTime}`)
        if (Number.isNaN(local.getTime())) throw new Error('invalid_schedule')
        payload.scheduledAt = local.toISOString()
      }
      const result = await adminBrevo(mode, payload)
      await refresh({ soft: true })
      if (mode === 'send') {
        setSentModal({
          subject,
          sent: result.sent ?? null,
        })
        setOk('')
      } else {
        setOk(t('admin.campaignScheduled'))
        setScheduleOpen(false)
      }
    } catch (caught) {
      if (caught.message === 'list_empty') {
        setError(t('admin.listEmpty'))
      } else if (caught.message === 'list_empty_lang') {
        setError(t('admin.listEmptyLang'))
      } else {
        const detail = caught.detail ? ` (${caught.detail})` : ''
        setError((caught.message || t('admin.error')) + detail)
      }
    } finally {
      setBusy(false)
    }
  }

  function renderCampaign(campaign) {
    const when = formatCampaignDateTime(campaignWhen(campaign))
    return (
      <li key={campaign.id}>
        <button
          type="button"
          className="admin-campaign-btn"
          disabled={previewBusy}
          onClick={() => openCampaignPreview(campaign)}
        >
          <span className="admin-list-title">{campaign.subject || campaign.name}</span>
          <span className="admin-list-meta">
            {campaignStatusLabel(campaign)}
            {when ? ` · ${when}` : ''}
            {campaign.subject && campaign.name ? ` · ${campaign.name}` : ''}
          </span>
          <span className="admin-campaign-hint">{t('admin.campaignOpenPreview')}</span>
        </button>
      </li>
    )
  }

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.newsletterTitle')}</h2>
        <p>{t('admin.newsletterLead')}</p>
      </header>

      <div className="admin-stat-grid admin-stat-grid-langs" aria-busy={statsBusy || undefined}>
        <AdminStatCard
          label={t('admin.newsletterSubscribers')}
          value={subscribers ?? '—'}
          loading={statsBusy}
        />
        <AdminStatCard label={t('admin.sendLangFr')} value={langStats?.fr ?? '—'} loading={statsBusy} />
        <AdminStatCard label={t('admin.sendLangEs')} value={langStats?.es ?? '—'} loading={statsBusy} />
        <AdminStatCard label={t('admin.sendLangPt')} value={langStats?.pt ?? '—'} loading={statsBusy} />
        <AdminStatCard label={t('admin.sendLangEn')} value={langStats?.en ?? '—'} loading={statsBusy} />
      </div>

      <div className="admin-newsletter-layout">
        <form
          className="admin-card admin-form admin-form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            submit('send')
          }}
        >
          <label>
            <span>{t('admin.fieldSubject')}</span>
            <input className="admin-control" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>
            <span>{t('admin.fieldMessage')}</span>
            <textarea
              className="admin-control admin-message"
              required
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder={t('admin.fieldMessagePlaceholder')}
            />
          </label>
          <label>
            <span>{t('admin.fieldSendLang')}</span>
            <select
              className="admin-control"
              value={sendLang}
              onChange={(e) => setSendLang(e.target.value)}
            >
              <option value="fr">{t('admin.sendLangFr')}</option>
              <option value="es">{t('admin.sendLangEs')}</option>
              <option value="pt">{t('admin.sendLangPt')}</option>
              <option value="en">{t('admin.sendLangEn')}</option>
              <option value="all">{t('admin.sendLangAll')}</option>
            </select>
            <span className="admin-field-help">{t('admin.fieldSendLangHelp')}</span>
          </label>
          <label>
            <span>{t('admin.fieldSignature')}</span>
            <textarea
              className="admin-control"
              rows={3}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={DEFAULT_NEWSLETTER_SIGNATURE}
            />
            <span className="admin-field-help">{t('admin.fieldSignatureHelp')}</span>
          </label>

          {scheduleOpen ? (
            <div className="admin-schedule-panel">
              <div className="admin-schedule-row">
                <label>
                  <span>{t('admin.fieldScheduleDate')}</span>
                  <input
                    className="admin-control"
                    type="date"
                    required
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </label>
                <label>
                  <span>{t('admin.fieldScheduleTime')}</span>
                  <input
                    className="admin-control"
                    type="time"
                    required
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </label>
              </div>
              <div className="admin-form-actions">
                <button type="button" className="admin-primary" disabled={busy} onClick={() => submit('schedule')}>
                  {t('admin.scheduleConfirm')}
                </button>
                <button
                  type="button"
                  className="admin-secondary"
                  disabled={busy}
                  onClick={() => setScheduleOpen(false)}
                >
                  {t('admin.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-form-actions">
              <button type="submit" className="admin-primary" disabled={busy}>{t('admin.sendNow')}</button>
              <button
                type="button"
                className="admin-secondary"
                disabled={busy}
                onClick={() => setScheduleOpen(true)}
              >
                {t('admin.schedule')}
              </button>
            </div>
          )}
        </form>

        <aside className="admin-mail-preview" aria-label={t('admin.emailPreview')}>
          <p className="admin-mail-preview-kicker">{t('admin.emailPreview')}</p>
          <p className="admin-mail-subject">{subject || t('admin.newsletterSubjectPlaceholder')}</p>
          <p className="admin-mail-preheader">{effectivePreview}</p>
          <div className="admin-mail-frame" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </aside>
      </div>

      {error ? <p className="admin-error">{error}</p> : null}
      {ok ? <p className="admin-ok">{ok}</p> : null}

      <div className="admin-history">
        <h3 className="admin-subtitle admin-subtitle-compact">{t('admin.recentCampaigns')}</h3>
        {campaigns.length === 0 ? (
          <p className="admin-empty">{t('admin.noCampaigns')}</p>
        ) : (
          <>
            <ul className="admin-list admin-list-compact">
              {latestCampaign ? renderCampaign(latestCampaign) : null}
            </ul>
            {olderCampaigns.length > 0 ? (
              <div className="admin-collapse">
                <button
                  type="button"
                  className="admin-collapse-toggle"
                  onClick={() => setHistoryOpen((value) => !value)}
                >
                  {historyOpen
                    ? t('admin.hideOlderCampaigns')
                    : t('admin.showOlderCampaigns', { count: olderCampaigns.length })}
                </button>
                {historyOpen ? (
                  <ul className="admin-list admin-list-compact">{olderCampaigns.map(renderCampaign)}</ul>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>

      {sentModal ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-sent-title">
          <div className="admin-modal-card">
            <p className="admin-modal-kicker">{t('admin.sentModalKicker')}</p>
            <h2 id="admin-sent-title" className="admin-modal-title">{t('admin.sentModalTitle')}</h2>
            <p className="admin-modal-text">
              {sentModal.sent
                ? t('admin.sentModalTextCount', { subject: sentModal.subject, count: sentModal.sent })
                : t('admin.sentModalText', { subject: sentModal.subject })}
            </p>
            <button type="button" className="admin-primary" onClick={() => setSentModal(null)}>
              {t('admin.sentModalClose')}
            </button>
          </div>
        </div>
      ) : null}

      {campaignPreview ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-campaign-preview-title">
          <div className="admin-modal-card admin-modal-card-wide">
            <p className="admin-modal-kicker">{t('admin.campaignPreviewKicker')}</p>
            <h2 id="admin-campaign-preview-title" className="admin-modal-title admin-modal-title-sm">
              {campaignPreview.subject || campaignPreview.name}
            </h2>
            <p className="admin-modal-text">
              {[
                campaignStatusLabel(campaignPreview),
                formatCampaignDateTime(campaignWhen(campaignPreview)),
              ].filter(Boolean).join(' · ')}
            </p>
            {campaignPreview.htmlContent ? (
              <div
                className="admin-mail-frame admin-campaign-preview-frame"
                dangerouslySetInnerHTML={{ __html: campaignPreview.htmlContent }}
              />
            ) : (
              <p className="admin-empty">{t('admin.campaignPreviewEmpty')}</p>
            )}
            <button type="button" className="admin-primary" onClick={() => setCampaignPreview(null)}>
              {t('admin.sentModalClose')}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default AdminNewsletter
