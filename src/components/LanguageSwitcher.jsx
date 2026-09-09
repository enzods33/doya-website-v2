import { useEffect, useId, useRef, useState } from 'react'
import { localeCatalog } from '../i18n/index.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { LocaleFlag } from './LocaleFlag.jsx'

function LocaleMark({ code }) {
  const meta = localeCatalog[code]
  if (!meta) return null
  return (
    <span className="language-mark">
      <LocaleFlag code={code} />
      <span className="language-code">{meta.label}</span>
    </span>
  )
}

function LanguageSwitcher({ className = '' }) {
  const { locale, locales, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(code) {
    setLocale(code)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`language-switcher${className ? ` ${className}` : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="language-trigger"
        aria-label={t('a11y.language')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <LocaleMark code={locale} />
      </button>
      <ul
        id={listId}
        className="language-menu"
        role="listbox"
        aria-label={t('a11y.language')}
        aria-hidden={!open}
        inert={!open || undefined}
      >
        {locales.map((code) => (
          <li key={code} role="option" aria-selected={locale === code}>
            <button type="button" className="language-option" tabIndex={open ? 0 : -1} onClick={() => choose(code)}>
              <LocaleMark code={code} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LanguageSwitcher
