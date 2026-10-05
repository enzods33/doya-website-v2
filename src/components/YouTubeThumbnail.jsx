import { youtubeThumbnailUrl } from '../commerce/clips.js'

function YouTubeThumbnail({ videoId, className, width, height }) {
  function onError(event) {
    const fallback = youtubeThumbnailUrl(videoId, 'fallback')
    if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback
  }

  return <img className={className} src={youtubeThumbnailUrl(videoId)} onError={onError} alt="" loading="lazy" decoding="async" width={width} height={height} />
}

export default YouTubeThumbnail
