import { useEffect, useId, useRef, useState } from 'react'
import { album } from '../../data/album.js'
import { media } from '../../data/media.js'
import { isExternalUrl } from '../../utils/links.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import Photo from '../../components/Photo.jsx'
import Reveal from '../../components/Reveal.jsx'
import Link from '../../components/Link.jsx'
import { PlatformIcon, TRACK_PLATFORM_ORDER } from '../../components/PlatformIcon.jsx'
import { trackEvent } from '../../commerce/pageAnalytics.js'
import monogramWhite from '../../assets/logos/doya-monogram-white.svg'
import FeaturedVideo from '../clips/Clips.jsx'

const PLATFORM_NAMES = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  deezer: 'Deezer',
  youtubemusic: 'YouTube Music',
  youtube: 'YouTube',
}

const VINYL_GROOVES = [38, 42, 46, 50, 54, 58, 62, 66, 70, 74, 78, 82, 86, 90, 94]

function VinylDisc({ className = '' }) {
  const vinylId = useId().replace(/:/g, '')
  const shellGradientId = `vinyl-shell-${vinylId}`
  const labelGradientId = `vinyl-label-${vinylId}`
  const sheenGradientId = `vinyl-sheen-${vinylId}`

  return (
    <div className={className} aria-hidden="true">
      <div className="music-tracklist-vinyl-rotor">
        <svg className="music-tracklist-vinyl-disc" viewBox="0 0 200 200" focusable="false">
          <defs>
            <radialGradient id={shellGradientId} cx="34%" cy="28%" r="78%">
              <stop offset="0" stopColor="#8f8a84" stopOpacity=".74" />
              <stop offset=".22" stopColor="#4e4a46" stopOpacity=".94" />
              <stop offset=".68" stopColor="#242220" stopOpacity=".98" />
              <stop offset="1" stopColor="#11100f" />
            </radialGradient>
            <radialGradient id={labelGradientId} cx="34%" cy="28%" r="78%">
              <stop offset="0" stopColor="#66615c" />
              <stop offset=".58" stopColor="#34312e" />
              <stop offset="1" stopColor="#1d1b1a" />
            </radialGradient>
            <linearGradient id={sheenGradientId} x1="8%" y1="4%" x2="94%" y2="96%">
              <stop offset="0" stopColor="#fff" stopOpacity=".02" />
              <stop offset=".28" stopColor="#fff" stopOpacity=".05" />
              <stop offset=".43" stopColor="#fff" stopOpacity=".34" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".07" />
              <stop offset=".73" stopColor="#e6d8c7" stopOpacity=".18" />
              <stop offset="1" stopColor="#fff" stopOpacity=".02" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="98" fill={`url(#${shellGradientId})`} />
          <circle cx="100" cy="100" r="98" fill={`url(#${sheenGradientId})`} />
          <circle cx="100" cy="100" r="97" fill="none" stroke="#fff" strokeWidth=".8" opacity=".42" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="#0b0a0a" strokeWidth=".7" opacity=".74" />
          <g fill="none" stroke="#f4eee6" strokeWidth="0.42" opacity="0.38">
            {VINYL_GROOVES.map((r) => (
              <circle key={r} cx="100" cy="100" r={r} />
            ))}
          </g>
          <g fill="none" stroke="#090808" strokeWidth=".44" opacity=".62">
            <circle cx="100" cy="100" r="45" />
            <circle cx="100" cy="100" r="57" />
            <circle cx="100" cy="100" r="69" />
            <circle cx="100" cy="100" r="81" />
          </g>
          <circle cx="100" cy="100" r="34" fill={`url(#${labelGradientId})`} />
          <circle cx="100" cy="100" r="32" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.44" />
          <circle cx="100" cy="100" r="3.2" fill="#d6001c" opacity=".92" />
          <circle cx="100" cy="100" r="1.15" fill="#f8f5f0" />
        </svg>
        <img
          src={monogramWhite}
          alt=""
          className="music-tracklist-vinyl-mark"
          draggable="false"
        />
      </div>
    </div>
  )
}

function trackListenLinks(track) {
  return TRACK_PLATFORM_ORDER.map((id) => ({
    id,
    url: track.links?.[id] ?? null,
    name: PLATFORM_NAMES[id],
  })).filter((link) => isExternalUrl(link.url))
}

function PlayGlyph() {
  return (
    <svg className="track-play-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8.2 5.6v12.8L19 12 8.2 5.6Z" fill="currentColor" />
    </svg>
  )
}

function ShopBuy({ className = '' }) {
  const { t } = useI18n()
  if (!album.buyHref) return null
  const label = t('music.buy')
  const classes = `album-buy${className ? ` ${className}` : ''}`
  if (album.buyHref.startsWith('http')) {
    return (
      <a className={classes} href={album.buyHref} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    )
  }
  return (
    <Link className={classes} href={album.buyHref}>
      {label}
    </Link>
  )
}

function TrackListen({ track, open, onToggle }) {
  const { t } = useI18n()
  const reactId = useId()
  const panelId = `${reactId}-panel`
  const links = trackListenLinks(track)
  if (!links.length) return <span className="track-listen-slot" aria-hidden="true" />

  return (
    <div className={`track-listen${open ? ' is-open' : ''}`}>
      <div
        id={panelId}
        className={`track-listen-panel${open ? ' is-open' : ''}`}
        role="group"
        aria-label={t('music.listenTrackMenu', { title: track.title })}
        aria-hidden={!open}
        inert={open ? undefined : true}
      >
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="track-listen-link"
            tabIndex={open ? 0 : -1}
            aria-label={t('music.trackOn', { title: track.title, platform: link.name })}
            onClick={() => trackEvent('stream_open', 'music')}
          >
            <PlatformIcon id={link.id} />
          </a>
        ))}
      </div>
      <button
        type="button"
        className="track-play"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={t('music.listenTrack', { title: track.title })}
        onClick={() => onToggle(track.number)}
      >
        <PlayGlyph />
      </button>
    </div>
  )
}

function Music() {
  const { t } = useI18n()
  const [openTrack, setOpenTrack] = useState(null)
  const [tracklistEntered, setTracklistEntered] = useState(false)
  const tracklistProbeRef = useRef(null)
  const albumTitle = t('music.albumTitle')
  const [albumTitleLead, ...albumTitleTailParts] = albumTitle.trim().split(/\s+/)
  const albumTitleTail = albumTitleTailParts.join(' ')
  const albumPlatforms = album.platforms.filter(
    (platform) => platform.id !== 'youtube' && isExternalUrl(platform.url),
  )

  useEffect(() => {
    if (tracklistEntered) return undefined
    const node = tracklistProbeRef.current
    if (!node || !('IntersectionObserver' in window)) {
      setTracklistEntered(true)
      return undefined
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      setTracklistEntered(true)
      observer.disconnect()
    }, { threshold: 0.28 })

    observer.observe(node)
    return () => observer.disconnect()
  }, [tracklistEntered])

  useEffect(() => {
    if (!openTrack) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpenTrack(null)
    }
    function onPointerDown(event) {
      if (event.target.closest?.('.track-listen')) return
      setOpenTrack(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [openTrack])

  function toggleTrack(number) {
    setOpenTrack((current) => (current === number ? null : number))
  }

  return (
    <section
      id="music"
      className="music-section"
      aria-labelledby="music-title"
      style={{ '--music-atmosphere-image': `url("${media.hero.backgroundSrc}")` }}
    >
      <div className="music-shell section-shell">
        <Reveal as="header" className="music-heading music-heading-editorial">
          <p className="eyebrow">{t('music.eyebrow')}</p>
          <h2 id="music-title" className="editorial-title music-editorial-title" aria-label={albumTitle}>
            <span className="music-title-line" aria-hidden="true">{albumTitleLead}</span>
            {albumTitleTail ? <span className="music-title-line music-title-line-offset" aria-hidden="true">{albumTitleTail}</span> : null}
          </h2>
          <div className="music-folio" aria-hidden="true">
            <span className="music-folio-number">01</span>
            <span className="music-folio-copy">{album.artist} / {album.year}</span>
          </div>
          <p className="eyebrow music-meta">{album.artist} <span className="small-separator">/</span> {album.year} <span className="small-separator">/</span> {t('music.tracksMeta', { n: album.tracks.length })}</p>
        </Reveal>
        <div className="music-layout">
          <Reveal className="music-cover-column" distance={34} duration={1.05}>
            <div className="music-cover-stage">
              <Photo image={media.cover} className="album-cover" />
            </div>
            <div className="music-cover-foot">
              {albumPlatforms.length > 0 && (
                <div className="music-platform-panel">
                  <p className="music-listen-label">{t('music.listenAlbum')}</p>
                  <ul className="album-platforms" aria-label={t('music.listenAlbum')}>
                    {albumPlatforms.map((platform) => (
                      <li key={platform.id}>
                        <a
                          href={platform.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t('music.listenOn', { platform: platform.name })}
                          onClick={() => trackEvent('stream_open', 'music')}
                        >
                          <PlatformIcon id={platform.id} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="music-buy-under">
                <ShopBuy />
              </div>
            </div>
          </Reveal>
          <Reveal className={`tracklist-column${tracklistEntered ? ' is-entered' : ''}`} delay={0.12} distance={28} duration={1}>
            <VinylDisc className="music-tracklist-vinyl" />
            <div ref={tracklistProbeRef} className="music-liner-sheet">
              <div className="music-liner-head" aria-hidden="true">
                <span>{album.artist}</span>
                <span>{t('music.tracksMeta', { n: album.tracks.length })}</span>
              </div>
              <ol className="tracklist">
                {album.tracks.map((track) => (
                  <li key={track.number}>
                    <div className={`track-row${openTrack === track.number ? ' is-open' : ''}`}>
                      <span className="track-number">{track.number}</span>
                      <span className="track-title" lang={track.number === '03' ? 'fr' : 'es'}>{track.title}</span>
                      <TrackListen
                        track={track}
                        open={openTrack === track.number}
                        onToggle={toggleTrack}
                      />
                    </div>
                  </li>
                ))}
              </ol>
              <div className="music-liner-foot" aria-hidden="true">
                <span>{album.title}</span>
                <span>{album.year}</span>
              </div>
            </div>
          </Reveal>
        </div>
        <FeaturedVideo />
      </div>
    </section>
  )
}

export default Music
