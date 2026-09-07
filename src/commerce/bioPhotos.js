import { galleryImages as fallbackGallery } from '../data/media.js'
import { supabase } from './supabase.js'

function normalizePhoto(row) {
  return {
    src: row.public_url,
    width: row.width,
    height: row.height,
    alt: row.alt || 'Photographie DOYA — Luna Bohemia.',
  }
}

/** Galerie bio publiée (Supabase) ; fallback `media.js` si vide / indisponible. */
export async function loadBioGallery() {
  if (!supabase) return fallbackGallery

  const { data, error } = await supabase
    .from('bio_photos')
    .select('public_url, width, height, alt, sort_order')
    .eq('published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !Array.isArray(data) || data.length === 0) return fallbackGallery
  return data.map(normalizePhoto)
}
