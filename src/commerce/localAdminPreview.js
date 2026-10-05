import { loadFeaturedClip, youtubeVideoId, youtubeWatchUrl } from './clips.js'
import { writeLocalVideoPreview } from './localVideoPreview.js'
import { supabase } from './supabase.js'

export async function localAdminPreview(path, body) {
  if (path === 'admin-clips') {
    if (body.action === 'get') {
      const clip = await loadFeaturedClip()
      return { clip: { enabled: clip.enabled, title: clip.title, video_url: clip.videoUrl } }
    }
    if (body.action !== 'preview' && body.action !== 'save') throw new Error('read_only_preview')
    const id = youtubeVideoId(body.video_url)
    if (!id) throw new Error('invalid_youtube_url')
    const title = String(body.title || '').trim()
    const clip = { enabled: body.enabled !== false, title, video_url: youtubeWatchUrl(id) }
    if (body.action === 'save') {
      if (!title || title.length > 120) throw new Error('invalid_clip_title')
      // Only this browser's preview changes. No function or database write is called.
      writeLocalVideoPreview(clip)
    }
    return { clip }
  }
  const reads = {
    'admin-concerts:list': ['concerts', 'concerts'],
    'admin-bio-photos:list': ['bio_photos', 'photos'],
    'admin-bio-photos:get_bio': ['site_bio', 'bio'],
  }
  const read = reads[`${path}:${body.action}`]
  if (!read || !supabase) throw new Error('read_only_preview')
  const { data, error } = await supabase.from(read[0]).select('*')
  if (error) throw new Error('read_only_preview')
  return { [read[1]]: data || [] }
}
