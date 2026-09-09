import { useEffect, useState } from 'react'
import { adminBioPhotos, adminBioUpload } from '../../commerce/admin.js'
import { prepareBioImage } from '../../commerce/prepareBioImage.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { LocaleFlag } from '../../components/LocaleFlag.jsx'

const BIO_LOCALES = ['fr', 'es', 'en', 'pt']

const EMPTY_BIO = Object.fromEntries(BIO_LOCALES.map((locale) => [locale, { lead: '', body: '' }]))

function orderPayload(list) {
  return list.map((photo, i) => ({ id: photo.id, sort_order: (i + 1) * 10 }))
}

function AdminBio() {
  const { t } = useI18n()
  const [photos, setPhotos] = useState([])
  const [orderDrafts, setOrderDrafts] = useState({})
  const [bioByLocale, setBioByLocale] = useState(EMPTY_BIO)
  const [bioLocale, setBioLocale] = useState('fr')
  const [busy, setBusy] = useState(false)
  const [bioBusy, setBioBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  function syncDrafts(list) {
    const drafts = {}
    list.forEach((photo, index) => {
      drafts[photo.id] = String(index + 1)
    })
    setOrderDrafts(drafts)
  }

  async function refreshPhotos() {
    const payload = await adminBioPhotos('list')
    const next = payload.photos ?? []
    setPhotos(next)
    syncDrafts(next)
  }

  async function refreshBio() {
    const payload = await adminBioPhotos('get_bio')
    const next = { ...EMPTY_BIO }
    for (const row of payload.bio ?? []) {
      if (!BIO_LOCALES.includes(row.locale)) continue
      next[row.locale] = {
        lead: row.lead ?? '',
        body: row.body ?? '',
      }
    }
    setBioByLocale(next)
  }

  useEffect(() => {
    Promise.all([refreshPhotos(), refreshBio()]).catch(() => setError(t('admin.error')))
  }, [t])

  function uploadErrorMessage(code) {
    if (code === 'invalid_image_type') return t('admin.invalidImageType')
    if (code === 'image_decode_failed' || code === 'image_prepare_failed') return t('admin.imagePrepareFailed')
    if (code === 'file_too_large') return t('admin.fileTooLarge')
    if (code === 'r2_upload_failed') return t('admin.r2UploadFailed')
    return t('admin.error')
  }

  async function persistOrder(next) {
    setBusy(true)
    setError('')
    try {
      await adminBioPhotos('reorder', { order: orderPayload(next) })
      setPhotos(next)
      syncDrafts(next)
      setOk(t('admin.orderSaved'))
    } catch {
      setError(t('admin.error'))
      await refreshPhotos().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  async function moveTo(fromIndex, toIndex) {
    if (busy || fromIndex === toIndex) return
    if (toIndex < 0 || toIndex >= photos.length) return
    const next = [...photos]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    await persistOrder(next)
    requestAnimationFrame(() => {
      document.querySelector(`[data-photo-id="${item.id}"]`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }

  async function applyOrderNumber(photoId) {
    if (busy) return
    const fromIndex = photos.findIndex((photo) => photo.id === photoId)
    if (fromIndex < 0) return

    const raw = String(orderDrafts[photoId] ?? '').trim()
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) {
      syncDrafts(photos)
      return
    }

    const toIndex = Math.min(photos.length - 1, Math.max(0, parsed - 1))
    if (toIndex === fromIndex) {
      syncDrafts(photos)
      return
    }
    await moveTo(fromIndex, toIndex)
  }

  async function onUpload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    setOk('')
    try {
      const prepared = await prepareBioImage(file)
      await adminBioUpload(prepared.file, { width: prepared.width, height: prepared.height })
      await refreshPhotos()
      setOk(t('admin.uploaded'))
    } catch (caught) {
      setError(uploadErrorMessage(caught.message))
    } finally {
      setBusy(false)
    }
  }

  async function toggle(photo) {
    setBusy(true)
    try {
      await adminBioPhotos('update', { id: photo.id, published: !photo.published })
      await refreshPhotos()
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  async function remove(photo) {
    if (!window.confirm(t('admin.confirmDeletePhoto'))) return
    setBusy(true)
    try {
      await adminBioPhotos('delete', { id: photo.id })
      await refreshPhotos()
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  function patchBioField(field, value) {
    setBioByLocale((prev) => ({
      ...prev,
      [bioLocale]: {
        ...prev[bioLocale],
        [field]: value,
      },
    }))
  }

  async function onSaveBio(event) {
    event.preventDefault()
    setBioBusy(true)
    setError('')
    setOk('')
    try {
      const draft = bioByLocale[bioLocale] ?? { lead: '', body: '' }
      await adminBioPhotos('save_bio', {
        locale: bioLocale,
        lead: draft.lead,
        body: draft.body,
      })
      setOk(t('admin.bioSaved', { locale: bioLocale.toUpperCase() }))
    } catch (caught) {
      if (caught.message === 'invalid_bio_copy') setError(t('admin.bioInvalid'))
      else if (caught.message === 'bio_copy_too_long') setError(t('admin.bioTooLong'))
      else setError(t('admin.error'))
    } finally {
      setBioBusy(false)
    }
  }

  const bioDraft = bioByLocale[bioLocale] ?? { lead: '', body: '' }

  return (
    <section className="admin-section admin-bio">
      <header className="admin-section-head">
        <h2>{t('admin.photosTitle')}</h2>
        <p>{t('admin.photosLead')}</p>
      </header>

      <form className="admin-card admin-form admin-form-stack admin-bio-copy" onSubmit={onSaveBio}>
        <h3 className="admin-subtitle admin-span-2">{t('admin.bioTextTitle')}</h3>
        <p className="admin-hint admin-span-2">{t('admin.bioTextLead')}</p>

        <div className="admin-bio-locales admin-span-2" role="group" aria-label={t('admin.bioLocale')}>
          {BIO_LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              className={`admin-bio-locale${bioLocale === code ? ' is-active' : ''}`}
              onClick={() => setBioLocale(code)}
            >
              <LocaleFlag code={code} className="admin-bio-locale-flag" />
              <span>{code.toUpperCase()}</span>
            </button>
          ))}
        </div>

        <label className="admin-span-2">
          <span>{t('admin.bioLeadLabel')}</span>
          <input
            className="admin-control"
            required
            maxLength={400}
            value={bioDraft.lead}
            onChange={(event) => patchBioField('lead', event.target.value)}
          />
        </label>

        <label className="admin-span-2">
          <span>{t('admin.bioBodyLabel')}</span>
          <textarea
            className="admin-control admin-bio-body"
            required
            rows={12}
            maxLength={6000}
            value={bioDraft.body}
            onChange={(event) => patchBioField('body', event.target.value)}
          />
        </label>
        <p className="admin-hint admin-span-2">{t('admin.bioBodyHint')}</p>

        <div className="admin-form-actions">
          <button type="submit" className="admin-primary" disabled={bioBusy}>
            {bioBusy ? t('admin.saving') : t('admin.bioSave')}
          </button>
        </div>
      </form>

      <h3 className="admin-subtitle">{t('admin.photosGalleryTitle')}</h3>
      <p className="admin-hint">{t('admin.photosReorderHint')}</p>

      <label className="admin-upload">
        <span>{busy ? t('admin.uploading') : t('admin.uploadPhoto')}</span>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          disabled={busy}
          onChange={onUpload}
        />
      </label>

      {error ? <p className="admin-error">{error}</p> : null}
      {ok ? <p className="admin-ok">{ok}</p> : null}

      {photos.length === 0 ? (
        <p className="admin-empty">{t('admin.photosEmpty')}</p>
      ) : (
        <ul className="admin-photo-grid">
          {photos.map((photo, index) => (
            <li
              key={photo.id}
              data-photo-id={photo.id}
              className={!photo.published ? 'is-hidden' : undefined}
            >
              <div className="admin-photo-frame">
                <img src={photo.public_url} alt="" width={photo.width} height={photo.height} draggable={false} />
                <span className={`admin-badge ${photo.published ? 'is-live' : 'is-off'}`}>
                  {photo.published ? t('admin.statusLive') : t('admin.statusHidden')}
                </span>
              </div>

              <label className="admin-photo-order">
                <span>{t('admin.photoOrder')}</span>
                <input
                  className="admin-control"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={photos.length}
                  disabled={busy}
                  value={orderDrafts[photo.id] ?? String(index + 1)}
                  onChange={(event) => {
                    setOrderDrafts((prev) => ({ ...prev, [photo.id]: event.target.value }))
                  }}
                  onBlur={() => applyOrderNumber(photo.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      event.currentTarget.blur()
                    }
                  }}
                  aria-label={t('admin.photoOrderAria', { n: index + 1 })}
                />
              </label>

              <div className="admin-photo-move">
                <button type="button" className="admin-move-btn" disabled={busy || index === 0} onClick={() => moveTo(index, 0)}>
                  {t('admin.moveFirst')}
                </button>
                <button type="button" className="admin-move-btn is-icon" disabled={busy || index === 0} onClick={() => moveTo(index, index - 1)} aria-label={t('admin.moveUp')}>
                  ↑
                </button>
                <button type="button" className="admin-move-btn is-icon" disabled={busy || index === photos.length - 1} onClick={() => moveTo(index, index + 1)} aria-label={t('admin.moveDown')}>
                  ↓
                </button>
                <button type="button" className="admin-move-btn" disabled={busy || index === photos.length - 1} onClick={() => moveTo(index, photos.length - 1)}>
                  {t('admin.moveLast')}
                </button>
              </div>
              <div className="admin-photo-actions">
                <button type="button" disabled={busy} onClick={() => toggle(photo)}>
                  {photo.published ? t('admin.unpublish') : t('admin.publish')}
                </button>
                <button type="button" disabled={busy} onClick={() => remove(photo)}>{t('admin.delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminBio
