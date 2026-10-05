import { youtubeVideoId, youtubeWatchUrl, youtubeThumbnailUrl } from '../../supabase/functions/_shared/youtube.js'
export { youtubeVideoId, youtubeWatchUrl, youtubeThumbnailUrl } from '../../supabase/functions/_shared/youtube.js'
import { defaultFeaturedClip } from '../data/clips.js'
import { readCache, writeCache } from './offlineCache.js'
import { readOnlyPreview } from './config.js'
import { readLocalVideoPreview } from './localVideoPreview.js'

const CACHE_KEY = 'featured-clip'

export function normalizeFeaturedClip(row, fallback = defaultFeaturedClip) {
  const sourceVideoUrl = typeof row?.video_url === 'string' ? row.video_url.trim() : fallback.videoUrl
  const title = typeof row?.title === 'string' && row.title.trim() ? row.title.trim().slice(0, 120) : fallback.title
  const videoId = youtubeVideoId(sourceVideoUrl)
  if (!videoId) return fallback
  return {
    enabled: row?.enabled !== false,
    title,
    videoUrl: youtubeWatchUrl(videoId),
    videoId,
    poster: youtubeThumbnailUrl(videoId) || fallback.poster,
  }
}

export async function loadFeaturedClip() {
  if (readOnlyPreview) {
    const local = readLocalVideoPreview()
    if (local) return normalizeFeaturedClip(local)
  }
  try {
    const { supabase } = await import('./supabase.js')
    if (!supabase) return normalizeFeaturedClip(readCache(CACHE_KEY))
    const { data, error } = await supabase
      .from('site_featured_clip')
      .select('enabled, title, video_url')
      .eq('id', true)
      .maybeSingle()
    if (error) return normalizeFeaturedClip(readCache(CACHE_KEY))
    if (!data) return defaultFeaturedClip
    const next = normalizeFeaturedClip(data)
    writeCache(CACHE_KEY, data)
    return next
  } catch {
    return normalizeFeaturedClip(readCache(CACHE_KEY))
  }
}
