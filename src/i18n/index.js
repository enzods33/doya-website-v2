import fr from './locales/fr.js'

export const LOCALES = ['fr', 'es', 'en', 'pt']
export const DEFAULT_LOCALE = 'fr'
export const STORAGE_KEY = 'doya-locale'

const LOCALE_META = {
  fr: { intl: 'fr-FR', label: 'FR' },
  es: { intl: 'es-ES', label: 'ES' },
  en: { intl: 'en-GB', label: 'EN' },
  pt: { intl: 'pt-PT', label: 'PT' },
}

/** Métadonnées légères (labels / BCP47) — messages chargés à la demande. */
export const localeCatalog = Object.fromEntries(
  LOCALES.map((code) => [code, { ...LOCALE_META[code], messages: code === 'fr' ? fr : null }]),
)

const localeLoaders = {
  fr: () => Promise.resolve(fr),
  es: () => import('./locales/es.js').then((m) => m.default),
  en: () => import('./locales/en.js').then((m) => m.default),
  pt: () => import('./locales/pt.js').then((m) => m.default),
}

const localeCache = new Map([['fr', fr]])

export function loadLocaleMessages(locale) {
  if (localeCache.has(locale)) return Promise.resolve(localeCache.get(locale))
  const loader = localeLoaders[locale]
  if (!loader) return Promise.resolve(fr)
  return loader().then((messages) => {
    localeCache.set(locale, messages)
    localeCatalog[locale].messages = messages
    return messages
  })
}

/** Messages déjà en mémoire (ex. après boot `main.jsx`), sinon null. */
export function peekLocaleMessages(locale) {
  return localeCache.get(locale) ?? null
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
