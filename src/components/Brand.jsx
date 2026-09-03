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

export function MenuIcon({ className = '' }) {
  return (
    <span className={`menu-icon${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="menu-icon-bar" />
      <span className="menu-icon-bar" />
      <span className="menu-icon-bar" />
    </span>
  )
}

export function HomeIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 11.25 12 4.75l7.5 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 10.5V19a.75.75 0 0 0 .75.75h3.5V14.5h2.5V19.75h3.5a.75.75 0 0 0 .75-.75v-8.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CartIcon({ className = '' }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.25 9.25h9.5l-.55 8.1a1.75 1.75 0 0 1-1.74 1.65H9.54a1.75 1.75 0 0 1-1.74-1.65l-.55-8.1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.25 9.25V8a2.75 2.75 0 0 1 5.5 0v1.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
