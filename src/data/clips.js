import { album } from './album.js'

const soloTu = album.tracks.find((track) => track.title === 'Solo tú')
const soloTuVideoId = new URL(soloTu?.links?.youtube ?? 'https://www.youtube.com/watch?v=sO-I92cpFSY').searchParams.get('v')

/**
 * Valeur livrable sans back-office : titre de présentation choisi pour le clip officiel.
 */
export const defaultFeaturedClip = {
  enabled: true,
  title: 'Solo tú',
  sourceVideoUrl: soloTu?.links?.youtube ?? '',
  videoId: soloTuVideoId ?? 'sO-I92cpFSY',
  videoUrl: `https://www.youtube.com/watch?v=${soloTuVideoId ?? 'sO-I92cpFSY'}`,
  poster: `https://i.ytimg.com/vi/${soloTuVideoId ?? 'sO-I92cpFSY'}/maxresdefault.jpg`,
}
