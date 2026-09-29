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
  de: (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="9" height="2" fill="#000" />
      <rect y="2" width="9" height="2" fill="#dd0000" />
      <rect y="4" width="9" height="2" fill="#ffce00" />
    </svg>
  ),
  ja: (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="9" height="6" fill="#fff" />
      <circle cx="4.5" cy="3" r="1.55" fill="#bc002d" />
    </svg>
  ),
  ko: (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="9" height="6" fill="#fff" />
      <path d="M4.5 1.7a1.3 1.3 0 0 1 0 2.6 1.3 1.3 0 0 0 0-2.6Z" fill="#cd2e3a" />
      <path d="M4.5 4.3a1.3 1.3 0 0 1 0-2.6 1.3 1.3 0 0 0 0 2.6Z" fill="#0047a0" />
      <path d="M1.2 1.35l.9.55M1.05 1.7l.9.55M6.9 4.1l.9.55M7.05 3.75l.9.55M6.95 1.8l.9-.55M6.8 2.15l.9-.55M1.05 4.2l.9-.55M1.2 4.55l.9-.55" stroke="#111" strokeWidth=".18" />
    </svg>
  ),
  zh: (
    <svg viewBox="0 0 9 6" aria-hidden="true" focusable="false">
      <rect width="9" height="6" fill="#de2910" />
      <polygon points="1.5,0.7 1.78,1.55 2.68,1.55 1.95,2.07 2.23,2.92 1.5,2.4 0.77,2.92 1.05,2.07 0.32,1.55 1.22,1.55" fill="#ffde00" />
      <circle cx="3.2" cy="0.85" r=".18" fill="#ffde00" />
      <circle cx="3.7" cy="1.45" r=".18" fill="#ffde00" />
      <circle cx="3.65" cy="2.25" r=".18" fill="#ffde00" />
      <circle cx="3.05" cy="2.8" r=".18" fill="#ffde00" />
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
