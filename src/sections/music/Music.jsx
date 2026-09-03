import { album } from '../../data/album.js'
import { media } from '../../data/media.js'
import { isExternalUrl } from '../../utils/links.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import Photo from '../../components/Photo.jsx'
import Reveal from '../../components/Reveal.jsx'
import { PlatformIcon, TRACK_PLATFORM_ORDER } from '../../components/PlatformIcon.jsx'

const PLATFORM_NAMES = { spotify: 'Spotify', apple: 'Apple Music', deezer: 'Deezer', youtube: 'YouTube' }

function trackPlatformSlots(track) {
  return TRACK_PLATFORM_ORDER.map((id) => ({
    id,
    url: track.links?.[id] ?? null,
    name: PLATFORM_NAMES[id],
  }))
}

function Music() {
  const { t } = useI18n()
  const albumPlatforms = album.platforms.filter((platform) => isExternalUrl(platform.url))
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
            {albumPlatforms.length > 0 && (
              <ul className="album-platforms" aria-label={t('music.listenAlbum')}>
                {albumPlatforms.map((platform) => (
                  <li key={platform.id}>
                    <a href={platform.url} target="_blank" rel="noopener noreferrer" aria-label={t('music.listenOn', { platform: platform.name })}>
                      <PlatformIcon id={platform.id} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {album.buyHref && (
              <a className="album-buy" href={album.buyHref} {...(album.buyHref.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                {t('music.buy')}
              </a>
            )}
          </div>
          <div className="tracklist-column">
            <ol className="tracklist">
              {album.tracks.map((track) => (
                <li key={track.number}>
                  <div className="track-row">
                    <span className="track-number">{track.number}</span>
                    <span className="track-title" lang={track.number === '03' ? 'fr' : 'es'}>{track.title}</span>
                    {trackPlatformSlots(track).map((link) => (
                      isExternalUrl(link.url) ? (
                        <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={t('music.trackOn', { title: track.title, platform: link.name })} className="track-platform-link">
                          <PlatformIcon id={link.id} />
                        </a>
                      ) : (
                        <span key={link.id} className="track-platform-slot" aria-hidden="true" />
                      )
                    ))}
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
