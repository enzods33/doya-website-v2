import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { defaultFeaturedClip } from '../../data/clips.js'
import { loadFeaturedClip, youtubeWatchUrl } from '../../commerce/clips.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import Reveal from '../../components/Reveal.jsx'
import YouTubeThumbnail from '../../components/YouTubeThumbnail.jsx'

function Clips() {
  const { t } = useI18n()
  const reducedMotion = useReducedMotion()
  const [clip, setClip] = useState(defaultFeaturedClip)

  useEffect(() => {
    let cancelled = false
    loadFeaturedClip().then((next) => {
      if (!cancelled) setClip(next)
    })
    return () => { cancelled = true }
  }, [])

  if (!clip.enabled) return null
  const videoId = clip.videoId
  const watchUrl = youtubeWatchUrl(videoId)

  return (
    <section className="music-video" aria-labelledby="music-video-title">
      <Reveal className="music-video-inner" distance={reducedMotion ? 0 : 18}>
        <header className="music-video-heading">
          <h3 id="music-video-title" className="editorial-title">{clip.title}</h3>
        </header>
        <div className="music-video-player">
          <a
            className="music-video-link"
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t('music.watchOnYoutube')} — ${clip.title}`}
          >
            <YouTubeThumbnail className="music-video-poster" videoId={videoId} width={1280} height={720} />
            <span className="music-video-youtube" aria-hidden="true">
              <svg viewBox="0 0 28 20" focusable="false">
                <rect width="28" height="20" rx="5" fill="#f00" />
                <path d="m11 5 8 5-8 5z" fill="#fff" />
              </svg>
              <span className="music-video-youtube-copy">
                <span>{t('music.watchOn')}</span>
                <strong>YouTube</strong>
              </span>
            </span>
          </a>
        </div>
      </Reveal>
    </section>
  )
}

export default Clips
