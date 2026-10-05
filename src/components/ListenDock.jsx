import { useEffect, useState } from 'react'
import { m } from 'motion/react'
import { album } from '../data/album.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { PlatformIcon } from './PlatformIcon.jsx'
import { trackEvent } from '../commerce/pageAnalytics.js'

const STORAGE_KEY = 'doya.listen-dock.hidden'
const AUDIO_PLATFORM_ORDER = ['spotify', 'apple', 'deezer', 'youtubemusic']
const MUSIC_SECTION_REVEAL_PROGRESS = 0.6

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
    let frame = 0
    const sections = new Map()
    const visibility = new Map()
    const intersectionObserver = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      for (const entry of entries) visibility.set(entry.target, entry.isIntersecting)
      syncVisibility()
    })

    function connectSections() {
      for (const selector of ['#music', '#shop', '.site-footer']) {
        const section = document.querySelector(selector)
        if (section && sections.get(selector) !== section) {
          const previous = sections.get(selector)
          if (previous) intersectionObserver?.unobserve(previous)
          sections.set(selector, section)
          intersectionObserver?.observe(section)
        }
      }
      // These sections mount lazily. Once connected, gallery/stock updates
      // no longer need to trigger page-wide geometry reads.
      if (sections.size === 3) mutationObserver.disconnect()
      syncVisibility()
    }

    function intersects(section, viewportHeight) {
      if (!section) return false
      if (intersectionObserver) return visibility.get(section) === true
      const rect = section.getBoundingClientRect()
      return rect.top < viewportHeight && rect.bottom > 0
    }

    function syncVisibility() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight
        const musicSection = sections.get('#music')
        const shopSection = sections.get('#shop')
        const footer = sections.get('.site-footer')

        let musicSectionSuppressesDock = false
        if (intersects(musicSection, viewportHeight)) {
          const rect = musicSection.getBoundingClientRect()
          const intersectsViewport = rect.top < viewportHeight && rect.bottom > 0
          const passedProgress = rect.height > 0 ? -rect.top / rect.height : 0
          musicSectionSuppressesDock = intersectsViewport && passedProgress < MUSIC_SECTION_REVEAL_PROGRESS
        }

        const footerSuppressesDock = intersects(footer, viewportHeight)
        const shopSuppressesDock = intersects(shopSection, viewportHeight)

        setExcludedSectionVisible(musicSectionSuppressesDock || shopSuppressesDock || footerSuppressesDock)
      })
    }

    window.addEventListener('scroll', syncVisibility, { passive: true })
    window.addEventListener('resize', syncVisibility)

    const mutationObserver = new MutationObserver(connectSections)
    const main = document.getElementById('main')
    if (main) mutationObserver.observe(main, { childList: true, subtree: true })
    connectSections()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', syncVisibility)
      window.removeEventListener('resize', syncVisibility)
      mutationObserver.disconnect()
      intersectionObserver?.disconnect()
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
        className="listen-dock-reopen"
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
      aria-label={t('listenDock.label', { title: t('music.albumTitle') })}
      initial={false}
    >
      <div className="listen-dock-copy">
        <span className="listen-dock-eyebrow">
          <i className="listen-dock-equalizer" aria-hidden="true"><b /><b /><b /></i>
          {t('listenDock.eyebrow')}
        </span>
        <strong>{t('music.albumTitle')}</strong>
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
