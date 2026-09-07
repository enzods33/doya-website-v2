/** Format galerie bio existante : JPEG, long côté ≤ 1600 px. */
export const BIO_IMAGE_MAX_EDGE = 1600
export const BIO_IMAGE_MIME = 'image/jpeg'
export const BIO_IMAGE_QUALITY = 0.85
const ALLOWED = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image_decode_failed'))
    }
    img.src = url
  })
}

function targetSize(width, height, maxEdge) {
  const long = Math.max(width, height)
  if (long <= maxEdge) return { width, height }
  const scale = maxEdge / long
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Valide (images seules) + redimensionne + encode JPEG pour la galerie bio.
 * @param {File} file
 * @returns {Promise<{ file: File, width: number, height: number }>}
 */
export async function prepareBioImage(file) {
  if (!(file instanceof File) || file.size <= 0) {
    throw new Error('invalid_image_type')
  }
  const mime = (file.type || '').toLowerCase()
  if (!ALLOWED.has(mime)) {
    throw new Error('invalid_image_type')
  }

  const img = await loadImage(file)
  const naturalW = img.naturalWidth || 0
  const naturalH = img.naturalHeight || 0
  if (naturalW < 1 || naturalH < 1) throw new Error('image_decode_failed')

  const { width, height } = targetSize(naturalW, naturalH, BIO_IMAGE_MAX_EDGE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('image_prepare_failed')
  ctx.drawImage(img, 0, 0, width, height)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('image_prepare_failed'))),
      BIO_IMAGE_MIME,
      BIO_IMAGE_QUALITY,
    )
  })

  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-') || 'photo'
  return {
    file: new File([blob], `${base}.jpg`, { type: BIO_IMAGE_MIME }),
    width,
    height,
  }
}
