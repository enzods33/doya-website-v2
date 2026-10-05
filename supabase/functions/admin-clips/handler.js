import { fetchYoutubeMetadata, youtubeVideoId } from '../_shared/youtube.js'

export async function handleClipAction(body, { readClip, saveClip, fetchMetadata = fetchYoutubeMetadata }) {
  if (body?.action === 'get') {
    const { data, error } = await readClip()
    return error
      ? { status: 500, body: { error: 'featured_clip_get_failed' } }
      : { status: 200, body: { clip: data } }
  }
  if (body?.action !== 'preview' && body?.action !== 'save') {
    return { status: 400, body: { error: 'invalid_action' } }
  }
  const videoUrl = typeof body.video_url === 'string' ? body.video_url.trim() : ''
  if (videoUrl.length > 2048 || !youtubeVideoId(videoUrl)) {
    return { status: 400, body: { error: 'invalid_youtube_url' } }
  }
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (body.action === 'save' && (!title || title.length > 120)) {
    return { status: 400, body: { error: 'invalid_clip_title' } }
  }
  let metadata
  try {
    metadata = await fetchMetadata(videoUrl)
  } catch {
    return { status: 422, body: { error: 'youtube_metadata_unavailable' } }
  }
  if (body.action === 'preview') return { status: 200, body: { clip: metadata } }
  // Recheck availability on save, while keeping the artist's freely chosen display title.
  const { data, error } = await saveClip({
    id: true,
    enabled: body.enabled !== false,
    ...metadata,
    title,
    updated_at: new Date().toISOString(),
  })
  return error
    ? { status: 500, body: { error: 'featured_clip_save_failed' } }
    : { status: 200, body: { clip: data } }
}
