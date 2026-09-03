import fr from './locales/fr.js'
import es from './locales/es.js'
import en from './locales/en.js'
import pt from './locales/pt.js'

export const LOCALES = ['fr', 'es', 'en', 'pt']
export const DEFAULT_LOCALE = 'fr'
export const STORAGE_KEY = 'doya-locale'

export const localeCatalog = {
  fr: { messages: fr, intl: 'fr-FR', label: 'FR' },
  es: { messages: es, intl: 'es-ES', label: 'ES' },
  en: { messages: en, intl: 'en-GB', label: 'EN' },
  pt: { messages: pt, intl: 'pt-PT', label: 'PT' },
}

export function getByPath(object, path) {
  return path.split('.').reduce((value, key) => (value == null ? undefined : value[key]), object)
}

export function interpolate(template, vars = {}) {
  if (typeof template !== 'string') return template
  return template.replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? `{${key}}` : String(vars[key])))
}

export function translate(messages, key, vars, fallbackMessages = fr) {
  const raw = getByPath(messages, key) ?? getByPath(fallbackMessages, key) ?? key
  return interpolate(raw, vars)
}

/** Mappe navigator.language → locale supportée (fallback FR). */
export function detectBrowserLocale(languages = typeof navigator !== 'undefined' ? navigator.languages : null) {
  const list = languages?.length
    ? [...languages]
    : [typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE]
  for (const raw of list) {
    if (!raw) continue
    const code = String(raw).toLowerCase().split('-')[0]
    if (LOCALES.includes(code)) return code
  }
  return DEFAULT_LOCALE
}

export function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.includes(stored)) return stored
  } catch {
    /* private mode */
  }
  return null
}

export function resolveInitialLocale() {
  return readStoredLocale() ?? detectBrowserLocale()
}
