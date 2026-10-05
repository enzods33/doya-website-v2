import { useEffect, useState } from 'react'
import { adminClips } from '../../commerce/admin.js'
import { defaultFeaturedClip } from '../../data/clips.js'
import { normalizeFeaturedClip, youtubeVideoId } from '../../commerce/clips.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import YouTubeThumbnail from '../../components/YouTubeThumbnail.jsx'

function AdminClips({ request = adminClips }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ enabled: true, title: defaultFeaturedClip.title, video_url: defaultFeaturedClip.videoUrl })
  const [loaded, setLoaded] = useState(false)
  const [metadata, setMetadata] = useState(null)
  const [previewError, setPreviewError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const videoId = youtubeVideoId(form.video_url)
  const preview = metadata?.videoId === videoId ? metadata : null

  useEffect(() => {
    let active = true
    request('get').then((payload) => {
      if (!active) return
      setForm({
        enabled: payload.clip?.enabled !== false,
        title: payload.clip?.title || defaultFeaturedClip.title,
        video_url: payload.clip?.video_url || defaultFeaturedClip.videoUrl,
      })
      setLoaded(true)
    }).catch(() => { if (active) setError(t('admin.error')) })
    return () => { active = false }
  }, [request, t])

  useEffect(() => {
    if (!loaded || !videoId) return undefined
    let active = true
    const controller = new AbortController()
    const timer = setTimeout(() => {
      request('preview', { video_url: form.video_url }, { signal: controller.signal })
        .then((payload) => {
          if (active && payload.clip) setMetadata(normalizeFeaturedClip(payload.clip))
        })
        .catch(() => { if (active) setPreviewError(true) })
    }, 450)
    return () => { active = false; clearTimeout(timer); controller.abort() }
  }, [loaded, videoId, form.video_url, request])

  function changeUrl(value) {
    setForm({ ...form, video_url: value })
    setMetadata(null)
    setPreviewError(false)
    setError('')
    setOk('')
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!loaded || !preview || previewError || busy || !form.title.trim()) return
    setBusy(true)
    setError('')
    setOk('')
    try {
      const payload = await request('save', form)
      if (payload.clip) setMetadata(normalizeFeaturedClip(payload.clip))
      setOk(t('admin.saved'))
    } catch (caught) {
      setError(caught.message === 'invalid_youtube_url' ? t('admin.clipUrlInvalid')
        : caught.message === 'youtube_metadata_unavailable' ? t('admin.clipMetadataError') : t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-section admin-clips">
      <header className="admin-section-head">
        <h2>{t('admin.clipsTitle')}</h2>
        <p>{t('admin.clipsLead')}</p>
      </header>
      <form className="admin-card admin-form" onSubmit={onSubmit}>
        <label className="admin-span-2">
          <span>{t('admin.clipTitle')}</span>
          <input className="admin-control" required maxLength={120} disabled={!loaded || busy} value={form.title} onChange={(event) => { setForm({ ...form, title: event.target.value }); setOk('') }} />
        </label>
        <label className="admin-span-2">
          <span>{t('admin.clipUrl')}</span>
          <input className="admin-control" type="url" required disabled={!loaded || busy} value={form.video_url} onChange={(event) => changeUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" aria-describedby="admin-video-help" />
        </label>
        <p id="admin-video-help" className="admin-hint admin-span-2">{t('admin.clipUrlHelp')}</p>
        <div className="admin-clips-preview admin-span-2" aria-live="polite" aria-busy={loaded && Boolean(videoId) && !preview && !previewError}>
          <p className="admin-hint">{t('admin.clipPreview')}</p>
          {preview ? <>
            <h3 className="admin-video-title">{form.title || '—'}</h3>
            <YouTubeThumbnail videoId={preview.videoId} width={480} height={270} />
          </> : <p className={previewError ? 'admin-error' : 'admin-hint'}>
            {!loaded ? t('admin.loading') : !videoId ? t('admin.clipUrlInvalid')
              : previewError ? t('admin.clipMetadataError') : t('admin.clipMetadataLoading')}
          </p>}
        </div>
        <label className="admin-switch">
          <input type="checkbox" disabled={!loaded || busy} checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
          <span>{t('admin.clipEnabled')}</span>
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="admin-primary" disabled={busy || !loaded || !preview || previewError || !form.title.trim()}>{busy ? t('admin.saving') : t('admin.clipSave')}</button>
        </div>
      </form>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      {ok ? <p className="admin-ok" role="status">{ok}</p> : null}
    </section>
  )
}

export default AdminClips
