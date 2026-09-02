import wordmarkBlack from '../assets/logos/doya-wordmark-black.svg'
import wordmarkWhite from '../assets/logos/doya-wordmark-white.svg'
import starsRed from '../assets/icons/doya-stars-red.svg'
import starsWhite from '../assets/icons/doya-stars-white.svg'
import starsBlack from '../assets/icons/doya-stars-black.svg'

export function Wordmark({ light = false, className = '', decorative = false }) {
  return <img src={light ? wordmarkWhite : wordmarkBlack} width="505" height="145" alt={decorative ? '' : 'DOYA'} className={className} />
}

export function Stars({ color = 'red', className = '' }) {
  const sources = { red: starsRed, white: starsWhite, black: starsBlack }
  return <img src={sources[color]} width="36" height="45" alt="" aria-hidden="true" className={className} />
}
