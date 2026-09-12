import { useEffect, useState } from 'react'
import { m, useReducedMotion } from 'motion/react'
import { album } from '../data/album.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { PlatformIcon, TRACK_PLATFORM_ORDER } from './PlatformIcon.jsx'
import { editorialEase } from '../utils/motion.js'
import { trackEvent } from '../commerce/pageAnalytics.js'

const STORAGE_KEY = 'doya.listen-dock.hidden'

function readHidden() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function ListenDock() {
  const [hidden, setHidden] = useState(readHidden)
  const [footerVisible, setFooterVisible] = useState(false)
  const reducedMotion = useReducedMotion()
  const { t } = useI18n()
  const linksByPlatform = Object.fromEntries(album.platforms.map((platform) => [platform.id, platform]))
  const links = TRACK_PLATFORM_ORDER
    .map((id) => linksByPlatform[id])
    .filter((item) => item?.url)

  useEffect(() => {
    const footer = document.querySelector('.site-footer')
    if (!footer || !('IntersectionObserver' in window)) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.01 },
    )
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

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

  if (links.length === 0 || footerVisible) return null

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
      aria-label={t('listenDock.label', { title: album.title })}
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 1.25, ease: editorialEase }}
    >
      <div className="listen-dock-copy">
        <span className="listen-dock-eyebrow">
          <i className="listen-dock-equalizer" aria-hidden="true"><b /><b /><b /></i>
          {t('listenDock.eyebrow')}
        </span>
        <strong>{album.title}</strong>
        <small>{album.artist} · {album.year}</small>
      </div>
      <div className="listen-dock-platforms" aria-label={t('listenDock.platforms')}>
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('music.listenOn', { platform: link.name })}
            onClick={() => trackEvent('stream_open', 'listen_dock')}
          >
            <PlatformIcon id={link.id} />
            <span>{link.name}</span>
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
