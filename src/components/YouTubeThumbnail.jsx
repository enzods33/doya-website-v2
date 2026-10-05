import { useState } from 'react'
import { youtubeThumbnailUrl } from '../commerce/clips.js'

function YouTubeThumbnail({ videoId, className, width, height }) {
  const [fallbackVideo, setFallbackVideo] = useState(null)
  const fallback = fallbackVideo === videoId
  const poster = youtubeThumbnailUrl(videoId, fallback ? 'fallback' : 'hd')
  const webp = poster && !fallback ? `https://i.ytimg.com/vi_webp/${videoId}/` : null

  return (
    <picture>
      {webp ? <source type="image/webp" media="(max-width: 600px)" srcSet={`${webp}sddefault.webp`} /> : null}
      {webp ? <source type="image/webp" srcSet={`${webp}maxresdefault.webp`} /> : null}
      <img className={className} src={poster}
        onError={() => { if (!fallback) setFallbackVideo(videoId) }}
        onLoad={(event) => {
          // Missing YouTube sizes can return a 120px placeholder with HTTP 200.
          if (!fallback && event.currentTarget.naturalWidth <= 120) setFallbackVideo(videoId)
        }}
        alt="" loading="lazy" decoding="async" width={width} height={height} />
    </picture>
  )
}

export default YouTubeThumbnail
