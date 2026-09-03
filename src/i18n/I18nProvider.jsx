import { createContext, useContext, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  LOCALES,
  STORAGE_KEY,
  localeCatalog,
  resolveInitialLocale,
  translate,
} from './index.js'
import fr from './locales/fr.js'

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => (
    typeof window === 'undefined' ? DEFAULT_LOCALE : resolveInitialLocale()
  ))

  useEffect(() => {
    document.documentElement.lang = locale
    const title = translate(localeCatalog[locale].messages, 'meta.title')
    const description = translate(localeCatalog[locale].messages, 'meta.description')
    document.title = title
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', description)
    const ogLocale = document.querySelector('meta[property="og:locale"]')
    if (ogLocale) ogLocale.setAttribute('content', localeCatalog[locale].intl.replace('-', '_'))
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

  const messages = localeCatalog[locale]?.messages ?? fr
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
