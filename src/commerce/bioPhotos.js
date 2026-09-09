import { galleryImages as fallbackGallery } from '../data/media.js'
import { readCache, writeCache } from './offlineCache.js'

function normalizePhoto(row) {
  return {
    src: row.public_url ?? row.src,
    width: row.width,
    height: row.height,
    alt: row.alt || 'Photographie DOYA — Luna Bohemia.',
  }
}

function galleryFallback() {
  const cached = readCache('bio-gallery')
  if (Array.isArray(cached) && cached.length) return cached.map(normalizePhoto)
  return fallbackGallery
}

/** Galerie bio publiée (Supabase) ; fallback cache / `media.js` si vide / hors ligne. */
export async function loadBioGallery() {
  try {
    const { supabase } = await import('./supabase.js')
    if (!supabase) return galleryFallback()

    const { data, error } = await supabase
      .from('bio_photos')
      .select('public_url, width, height, alt, sort_order')
      .eq('published', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error || !Array.isArray(data) || data.length === 0) return galleryFallback()

    const next = data.map(normalizePhoto)
    writeCache('bio-gallery', next)
    return next
  } catch {
    return galleryFallback()
  }
}

/** Texte bio pour une locale ; `null` si absent → i18n. Cache local après succès. */
export async function loadBioCopy(locale) {
  const code = String(locale || 'fr').toLowerCase()
  if (!['fr', 'es', 'en', 'pt'].includes(code)) return null
  const cacheKey = `bio-copy:${code}`

  try {
    const { supabase } = await import('./supabase.js')
    if (!supabase) return readCache(cacheKey)

    const { data, error } = await supabase
      .from('site_bio')
      .select('lead, body')
      .eq('locale', code)
      .maybeSingle()

    if (error || !data) return readCache(cacheKey)
    const lead = typeof data.lead === 'string' ? data.lead.trim() : ''
    const body = typeof data.body === 'string' ? data.body.trim() : ''
    if (!lead || !body) return readCache(cacheKey)
    const next = { lead, body }
    writeCache(cacheKey, next)
    return next
  } catch {
    return readCache(cacheKey)
  }
}
