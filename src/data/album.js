import { socials } from './socials.js'

// Orthographe et ordre des crédits du livret officiel, PDF pages 14–15.
// Liens album : temporairement les profils artistes (footer) tant que
// Luna Bohemia n’est pas publié — à remplacer par les URLs album officielles.
// Titres : liens renseignés uniquement pour les singles / clips déjà publiés.
const artistUrl = Object.fromEntries(socials.map((social) => [social.name, social.url]))

export const album = {
  title: 'Luna Bohemia',
  artist: 'DOYA',
  year: 2026,
  tracks: [
    { number: '01', title: 'Solo tú', links: {} },
    { number: '02', title: 'Ángel de la guarda', links: {} },
    { number: '03', title: 'Guerrières', links: {} },
    { number: '04', title: 'Casa de los limoneros', links: {} },
    {
      number: '05',
      title: 'Todo de mí',
      links: {
        spotify: 'https://open.spotify.com/track/0qXzNuDtSnvDywmwzzTxgv',
        apple: 'https://music.apple.com/fr/album/todo-de-mi/1863381490?i=1863381496',
        deezer: 'https://www.deezer.com/track/3777207412',
        youtube: 'https://www.youtube.com/watch?v=_p--JCV3xyY',
      },
    },
    {
      number: '06',
      title: 'Mariposa',
      links: {
        spotify: 'https://open.spotify.com/track/33B70dfszgAWsf8RCWSqao',
        apple: 'https://music.apple.com/fr/album/mariposa/1843759394?i=1843759395',
        deezer: 'https://www.deezer.com/track/3606520232',
        youtube: 'https://www.youtube.com/watch?v=w3R8leGVyRk',
      },
    },
    {
      number: '07',
      title: 'Lo vi venir',
      links: {
        spotify: 'https://open.spotify.com/track/6MtYj0BZWmGx9aCTVGObXS',
        apple: 'https://music.apple.com/fr/album/lo-vi-venir/6771816207?i=6771816211',
        deezer: 'https://www.deezer.com/track/4051556371',
        youtube: 'https://www.youtube.com/watch?v=iBmWuygOPc8',
      },
    },
    { number: '08', title: 'Ahora', links: {} },
    { number: '09', title: 'Dónde se va', links: {} },
    {
      number: '10',
      title: 'Mueve',
      links: {
        spotify: 'https://open.spotify.com/track/4Mnitba7ayBKEJa0mguDJQ',
        apple: 'https://music.apple.com/fr/album/mueve/1852533648?i=1852533649',
        deezer: 'https://www.deezer.com/track/3655259632',
        youtube: 'https://www.youtube.com/watch?v=koxJ52T-nZ8',
      },
    },
    { number: '11', title: 'Luna Bohemia', links: {} },
    { number: '12', title: 'Amor y libertad', links: {} },
  ],
  platforms: [
    { id: 'spotify', name: 'Spotify', url: artistUrl.Spotify },
    { id: 'apple', name: 'Apple Music', url: artistUrl['Apple Music'] },
    { id: 'deezer', name: 'Deezer', url: artistUrl.Deezer },
  ],
  listeningNote: 'Liens d’écoute officiels de l’album à renseigner à la sortie.',
  buyHref: '#shop',
  buyLabel: 'Merch',
}

/** Première URL d’écoute disponible pour un titre (compat tests / liens principaux). */
export function trackPrimaryUrl(track) {
  return track.links?.spotify || track.links?.apple || track.links?.deezer || track.links?.youtube || null
}
