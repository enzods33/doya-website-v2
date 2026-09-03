import { album } from '../../data/album.js'
import { media } from '../../data/media.js'
import { isExternalUrl } from '../../utils/links.js'
import Photo from '../../components/Photo.jsx'
import Reveal from '../../components/Reveal.jsx'

function Music() {
  const hasPlatform = album.platforms.some((platform) => isExternalUrl(platform.url))
  return (
    <section id="music" className="music-section section-shell" aria-labelledby="music-title">
      <Reveal as="header" className="section-heading">
        <div><p className="eyebrow section-kicker">L’album</p><h2 id="music-title" className="editorial-title">{album.title}</h2></div>
        <p className="eyebrow">{album.artist} <span className="small-separator">/</span> {album.year}</p>
      </Reveal>
      <div className="music-layout">
        <div className="music-cover-column">
          <figure><Photo image={media.cover} className="album-cover" /><figcaption className="photo-caption"><span>{album.title}</span><span>{album.year}</span></figcaption></figure>
          <div className="listening-area">
            <h3 className="eyebrow">Écouter l’album</h3>
            <ul className="platforms">
              {album.platforms.filter((platform) => isExternalUrl(platform.url)).map((platform) => <li key={platform.name}><a href={platform.url} target="_blank" rel="noopener noreferrer">{platform.name} ↗</a></li>)}
            </ul>
            {/* Note masquée tant que les liens ne sont pas renseignés */}
          </div>
        </div>
        <div className="tracklist-column">
          <div className="tracklist-header eyebrow"><h3>Tracklist</h3><span>{album.tracks.length} titres</span></div>
          <ol className="tracklist">
            {album.tracks.map((track) => <li key={track.number}>
              {isExternalUrl(track.url) ? <a className="track-row" href={track.url} target="_blank" rel="noopener noreferrer"><span className="track-number">{track.number}</span><span lang={track.number === '03' ? 'fr' : 'es'}>{track.title}</span><span aria-label="Écouter">↗</span></a>
                : <div className="track-row"><span className="track-number">{track.number}</span><span lang={track.number === '03' ? 'fr' : 'es'}>{track.title}</span></div>}
            </li>)}
          </ol>
        </div>
        <aside className="music-aside" aria-label="L’univers de l’album">
          <Photo image={media.portrait} className="music-portrait" />
          <div className="album-number"><span aria-hidden="true">{album.tracks.length}</span><p className="eyebrow">Titres<br />{album.title}</p></div>
        </aside>
      </div>
    </section>
  )
}

export default Music
