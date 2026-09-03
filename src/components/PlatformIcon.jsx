import spotify from '../assets/icons/platforms/spotify.png'
import apple from '../assets/icons/platforms/apple-music.png'
import deezer from '../assets/icons/platforms/deezer.png'
import youtube from '../assets/icons/platforms/youtube.svg'
import instagram from '../assets/icons/platforms/instagram.png'
import tiktok from '../assets/icons/platforms/tiktok.svg'
import facebook from '../assets/icons/platforms/facebook.png'

const sources = { spotify, apple, deezer, youtube, instagram, tiktok, facebook }

export function PlatformIcon({ id, className = '' }) {
  const src = sources[id]
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      className={`platform-icon platform-icon-${id}${className ? ` ${className}` : ''}`}
      width="40"
      height="40"
      decoding="async"
    />
  )
}

export const ALBUM_PLATFORM_ORDER = ['spotify', 'apple', 'deezer']
export const TRACK_PLATFORM_ORDER = ['spotify', 'apple', 'deezer', 'youtube']
