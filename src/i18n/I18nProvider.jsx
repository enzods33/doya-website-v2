import { createContext, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  LOCALES,
  STORAGE_KEY,
  localeCatalog,
  loadLocaleMessages,
  peekLocaleMessages,
  resolveInitialLocale,
  translate,
} from './index.js'
import fr from './locales/fr.js'

const I18nContext = createContext(null)

function useLocaleMessages(locale) {
  const cached = peekLocaleMessages(locale)
  const [asyncBundle, setAsyncBundle] = useState({ locale: null, messages: null })

  useEffect(() => {
    if (cached) return undefined
    let active = true
    loadLocaleMessages(locale).then((messages) => {
      if (active) setAsyncBundle({ locale, messages })
    })
    return () => { active = false }
  }, [locale, cached])

  if (cached) return cached
  if (asyncBundle.locale === locale && asyncBundle.messages) return asyncBundle.messages
  return fr
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => (
    typeof window === 'undefined' ? DEFAULT_LOCALE : resolveInitialLocale()
  ))
  const messages = useLocaleMessages(locale)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  function setLocale(next) {
    if (!LOCALES.includes(next)) return
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode */
    }
  }

  const intlLocale = localeCatalog[locale]?.intl ?? 'fr-FR'

  const value = {
    locale,
    locales: LOCALES,
    intlLocale,
    setLocale,
    t: (key, vars) => translate(messages, key, vars, fr),
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
