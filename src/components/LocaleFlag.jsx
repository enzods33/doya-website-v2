/** Drapeaux SVG simplifiés — fiables sur Windows (contrairement aux emoji). */

const FLAGS = {
  fr: (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="3" height="6" fill="#002395" />
      <rect x="3" width="3" height="6" fill="#fff" />
      <rect x="6" width="3" height="6" fill="#ed2939" />
    </svg>
  ),
  es: (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="9" height="6" fill="#c60b1e" />
      <rect y="1.5" width="9" height="3" fill="#ffc400" />
    </svg>
  ),
  en: (
    <svg viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 L60 40 M60 0 L0 40" stroke="#c8102e" strokeWidth="5" />
      <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0 V40 M0 20 H60" stroke="#c8102e" strokeWidth="7" />
    </svg>
  ),
  pt: (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="9" height="6" fill="#046a38" />
      <rect width="3.6" height="6" fill="#da291c" />
      <circle cx="3.6" cy="3" r="1.15" fill="#ffe135" />
      <circle cx="3.6" cy="3" r="0.72" fill="#002d72" />
    </svg>
  ),
}

export function LocaleFlag({ code, className = '' }) {
  const flag = FLAGS[code]
  if (!flag) return null
  return (
    <span className={`language-flag${className ? ` ${className}` : ''}`} aria-hidden="true">
      {flag}
    </span>
  )
}
