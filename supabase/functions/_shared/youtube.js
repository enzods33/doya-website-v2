export function youtubeVideoId(value) {
  try {
    const url = new URL(String(value || '').trim())
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let id = ''
    if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0]
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v') || ''
      if (!id && url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] || ''
      if (!id && url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] || ''
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export function youtubeWatchUrl(videoId) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(videoId || ''))
    ? `https://www.youtube.com/watch?v=${videoId}`
    : null
}

export function youtubeThumbnailUrl(videoId, quality = 'hd') {
  return /^[A-Za-z0-9_-]{11}$/.test(String(videoId || ''))
    ? `https://i.ytimg.com/vi/${videoId}/${quality === 'fallback' ? 'hqdefault' : 'maxresdefault'}.jpg`
    : null
}

// Admin only: visitors use the saved title and a thumbnail derived from the video ID.
export async function fetchYoutubeMetadata(value, { fetchImpl = globalThis.fetch } = {}) {
  const videoId = youtubeVideoId(value)
  if (!videoId) throw new Error('invalid_youtube_url')
  const endpoint = new URL('https://www.youtube.com/oembed')
  endpoint.searchParams.set('url', youtubeWatchUrl(videoId))
  endpoint.searchParams.set('format', 'json')
  try {
    const response = await fetchImpl(endpoint.href, {
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error('youtube_metadata_unavailable')
    const data = await response.json()
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    if (!title || title.length > 120) throw new Error('youtube_metadata_unavailable')
    return { title, video_url: youtubeWatchUrl(videoId) }
  } catch {
    throw new Error('youtube_metadata_unavailable')
  }
}
