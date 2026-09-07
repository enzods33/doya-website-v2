import { useEffect, useState } from 'react'
import { adminBioPhotos, adminBioUpload } from '../../commerce/admin.js'
import { prepareBioImage } from '../../commerce/prepareBioImage.js'
import { galleryImages } from '../../data/media.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'

function orderPayload(list) {
  return list.map((photo, i) => ({ id: photo.id, sort_order: (i + 1) * 10 }))
}

function AdminBio() {
  const { t } = useI18n()
  const [photos, setPhotos] = useState([])
  const [orderDrafts, setOrderDrafts] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  function syncDrafts(list) {
    const drafts = {}
    list.forEach((photo, index) => {
      drafts[photo.id] = String(index + 1)
    })
    setOrderDrafts(drafts)
  }

  async function refresh() {
    let payload = await adminBioPhotos('list')
    let next = payload.photos ?? []
    if (next.length === 0 && galleryImages.length > 0) {
      payload = await adminBioPhotos('import_site', {
        photos: galleryImages.map((image, index) => ({
          public_url: image.src,
          width: image.width,
          height: image.height,
          alt: image.alt,
          sort_order: (index + 1) * 10,
        })),
      })
      next = payload.photos ?? []
      if (payload.imported > 0) setOk(t('admin.photosImported', { count: payload.imported }))
    }
    setPhotos(next)
    syncDrafts(next)
  }

  useEffect(() => {
    refresh().catch(() => setError(t('admin.error')))
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
      await refresh().catch(() => {})
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
      await refresh()
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
      await refresh()
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
      await refresh()
    } catch {
      setError(t('admin.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-section">
      <header className="admin-section-head">
        <h2>{t('admin.photosTitle')}</h2>
        <p>{t('admin.photosLead')}</p>
        <p className="admin-hint">{t('admin.photosReorderHint')}</p>
      </header>

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
