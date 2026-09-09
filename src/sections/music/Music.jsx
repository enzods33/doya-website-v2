import { useEffect, useId, useState } from 'react'
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

const PLATFORM_NAMES = {
  spotify: 'Spotify',
  apple: 'Apple Music',
  deezer: 'Deezer',
  youtube: 'YouTube',
}

const VINYL_GROOVES = [42, 48, 54, 60, 66, 72, 78, 84, 90]

function VinylDisc({ className = '' }) {
  return (
    <div className={className} aria-hidden="true">
      <svg className="music-tracklist-vinyl-disc" viewBox="0 0 200 200" focusable="false">
        <circle cx="100" cy="100" r="98" fill="currentColor" />
        <g fill="none" stroke="var(--color-doya-white)" strokeWidth="0.9" opacity="0.22">
          {VINYL_GROOVES.map((r) => (
            <circle key={r} cx="100" cy="100" r={r} />
          ))}
        </g>
        <circle cx="100" cy="100" r="34" fill="currentColor" opacity="0.92" />
        <circle cx="100" cy="100" r="32" fill="none" stroke="var(--color-doya-white)" strokeWidth="0.7" opacity="0.2" />
      </svg>
      <img
        src={monogramWhite}
        alt=""
        className="music-tracklist-vinyl-mark"
        draggable="false"
      />
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
  const albumPlatforms = album.platforms.filter((platform) => isExternalUrl(platform.url))

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
    <section id="music" className="music-section" aria-labelledby="music-title">
      <div className="music-shell section-shell">
        <Reveal as="header" className="music-heading">
          <p className="eyebrow">{t('music.eyebrow')}</p>
          <h2 id="music-title" className="editorial-title">{album.title}</h2>
          <p className="eyebrow music-meta">{album.artist} <span className="small-separator">/</span> {album.year} <span className="small-separator">/</span> {t('music.tracksMeta', { n: album.tracks.length })}</p>
        </Reveal>
        <div className="music-layout">
          <div className="music-cover-column">
            <Photo image={media.cover} className="album-cover" />
            <div className="music-cover-foot">
              {albumPlatforms.length > 0 && (
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
              )}
              <div className="music-buy-under">
                <ShopBuy />
              </div>
            </div>
          </div>
          <div className="tracklist-column">
            <VinylDisc className="music-tracklist-vinyl" />
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
          </div>
          <figure className="music-aside">
            <Photo image={media.editorial} className="music-aside-photo" />
          </figure>
        </div>
      </div>
    </section>
  )
}

export default Music
