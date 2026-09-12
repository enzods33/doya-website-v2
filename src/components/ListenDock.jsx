import { useEffect, useState } from 'react'
import { m } from 'motion/react'
import { album } from '../data/album.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { PlatformIcon } from './PlatformIcon.jsx'
import { trackEvent } from '../commerce/pageAnalytics.js'

const STORAGE_KEY = 'doya.listen-dock.hidden'
const AUDIO_PLATFORM_ORDER = ['spotify', 'apple', 'deezer']

function readHidden() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function ListenDock() {
  const [hidden, setHidden] = useState(readHidden)
  const [excludedSectionVisible, setExcludedSectionVisible] = useState(
    () => typeof window !== 'undefined' && window.location.hash === '#music',
  )
  const { t } = useI18n()
  const linksByPlatform = Object.fromEntries(album.platforms.map((platform) => [platform.id, platform]))
  const links = AUDIO_PLATFORM_ORDER
    .map((id) => linksByPlatform[id])
    .filter((item) => item?.url)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined

    const visibleSections = new Set()
    const observedSections = new Set()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleSections.add(entry.target)
          else visibleSections.delete(entry.target)
        })
        setExcludedSectionVisible(visibleSections.size > 0)
      },
      { threshold: 0.01 },
    )

    function observeExcludedSections() {
      const sections = [document.querySelector('#music'), document.querySelector('.site-footer')].filter(Boolean)
      sections.forEach((section) => {
        if (observedSections.has(section)) return
        observedSections.add(section)
        observer.observe(section)
      })
    }

    observeExcludedSections()
    const mutationObserver = new MutationObserver(observeExcludedSections)
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    return () => {
      mutationObserver.disconnect()
      observer.disconnect()
    }
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

  if (links.length === 0) return null

  if (hidden) {
    return (
      <button
        type="button"
        className={`listen-dock-reopen${excludedSectionVisible ? ' is-suppressed' : ''}`}
        onClick={show}
        aria-label={t('listenDock.open')}
      >
        <span aria-hidden="true">▶</span>
      </button>
    )
  }

  return (
    <m.aside
      className={`listen-dock${excludedSectionVisible ? ' is-suppressed' : ''}`}
      aria-label={t('listenDock.label', { title: album.title })}
      initial={false}
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
            onClick={(event) => {
              if (event.detail > 0) event.currentTarget.blur()
              trackEvent('stream_open', 'listen_dock')
            }}
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
