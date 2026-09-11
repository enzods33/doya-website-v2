import { useState } from 'react'
import { m, useReducedMotion } from 'motion/react'
import { album } from '../data/album.js'
import { media } from '../data/media.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { PlatformIcon, TRACK_PLATFORM_ORDER } from './PlatformIcon.jsx'
import { editorialEase } from '../utils/motion.js'
import { trackEvent } from '../commerce/pageAnalytics.js'

const FEATURED_TRACK_NUMBER = '10'
const STORAGE_KEY = 'doya.listen-dock.hidden'
const PLATFORM_NAMES = { spotify: 'Spotify', apple: 'Apple Music', deezer: 'Deezer', youtube: 'YouTube' }

function readHidden() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function ListenDock() {
  const [hidden, setHidden] = useState(readHidden)
  const reducedMotion = useReducedMotion()
  const { t } = useI18n()
  const track = album.tracks.find((item) => item.number === FEATURED_TRACK_NUMBER)
  const links = TRACK_PLATFORM_ORDER
    .map((id) => ({ id, url: track?.links?.[id] }))
    .filter((item) => item.url)

  function hide() {
    setHidden(true)
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* private mode / quota */
    }
  }

  function show() {
    setHidden(false)
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* private mode / quota */
    }
  }

  if (!track || links.length === 0) return null

  if (hidden) {
    return (
      <button type="button" className="listen-dock-reopen" onClick={show} aria-label={t('listenDock.open')}>
        <span aria-hidden="true">▶</span>
      </button>
    )
  }

  return (
    <m.aside
      className="listen-dock"
      aria-label={t('listenDock.label', { title: track.title })}
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 1.25, ease: editorialEase }}
    >
      <div className="listen-dock-art" aria-hidden="true">
        <img className="listen-dock-cover" src={media.cover.src} alt="" width="84" height="84" />
        <span className="listen-dock-art-mark">✦</span>
      </div>
      <div className="listen-dock-copy">
        <span className="listen-dock-eyebrow">
          <i className="listen-dock-equalizer" aria-hidden="true"><b /><b /><b /></i>
          {t('listenDock.eyebrow')}
        </span>
        <strong>{track.title}</strong>
        <small>{album.artist} · {album.title}</small>
      </div>
      <div className="listen-dock-platforms" aria-label={t('listenDock.platforms')}>
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('music.trackOn', { title: track.title, platform: PLATFORM_NAMES[link.id] })}
            onClick={() => trackEvent('stream_open', 'listen_dock')}
          >
            <PlatformIcon id={link.id} />
            <span>{PLATFORM_NAMES[link.id]}</span>
          </a>
        ))}
      </div>
      <button type="button" className="listen-dock-close" onClick={hide} aria-label={t('listenDock.close')}>
        <span aria-hidden="true">×</span>
      </button>
    </m.aside>
  )
}

export default ListenDock
