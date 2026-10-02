import fr from './locales/fr.js'

export const LOCALES = ['fr', 'es', 'en', 'pt', 'de', 'ja', 'ko', 'zh', 'ar']
export const DEFAULT_LOCALE = 'fr'
export const STORAGE_KEY = 'doya-locale'

const LOCALE_META = {
  fr: { intl: 'fr-FR', label: 'FR' },
  es: { intl: 'es-ES', label: 'ES' },
  en: { intl: 'en-GB', label: 'EN' },
  pt: { intl: 'pt-PT', label: 'PT' },
  de: { intl: 'de-DE', label: 'DE' },
  ja: { intl: 'ja-JP', label: 'JA' },
  ko: { intl: 'ko-KR', label: 'KO' },
  zh: { intl: 'zh-CN', label: 'ZH' },
  ar: { intl: 'ar', label: 'AR', dir: 'rtl' },
}

/** Métadonnées légères (labels / BCP47) - messages chargés à la demande. */
export const localeCatalog = Object.fromEntries(
  LOCALES.map((code) => [code, { ...LOCALE_META[code], messages: code === 'fr' ? fr : null }]),
)

function mergeMessages(base, overrides) {
  if (Array.isArray(overrides)) return overrides
  if (!overrides || typeof overrides !== 'object') return overrides ?? base
  const next = { ...base }
  for (const [key, value] of Object.entries(overrides)) {
    const current = base?.[key]
    next[key] = (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && current
      && typeof current === 'object'
      && !Array.isArray(current)
    )
      ? mergeMessages(current, value)
      : value
  }
  return next
}

async function loadExtendedLocale(path) {
  const [english, overrides] = await Promise.all([
    import('./locales/en.js'),
    path(),
  ])
  return mergeMessages(english.default, overrides.default)
}

const localeLoaders = {
  fr: () => Promise.resolve(fr),
  es: () => import('./locales/es.js').then((m) => m.default),
  en: () => import('./locales/en.js').then((m) => m.default),
  pt: () => import('./locales/pt.js').then((m) => m.default),
  de: () => loadExtendedLocale(() => import('./locales/de.js')),
  ja: () => loadExtendedLocale(() => import('./locales/ja.js')),
  ko: () => loadExtendedLocale(() => import('./locales/ko.js')),
  zh: () => loadExtendedLocale(() => import('./locales/zh.js')),
  ar: () => loadExtendedLocale(() => import('./locales/ar.js')),
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

export function normalizeLocaleCode(raw) {
  const tag = String(raw ?? '').trim().toLowerCase().replaceAll('_', '-')
  if (!tag) return null
  if (tag === 'zh' || tag.startsWith('zh-')) return 'zh'
  const primary = tag.split('-')[0]
  return LOCALES.includes(primary) ? primary : null
}

/** Mappe navigator.language → locale supportée (fallback FR). */
export function detectBrowserLocale(languages = typeof navigator !== 'undefined' ? navigator.languages : null) {
  const list = languages?.length
    ? [...languages]
    : [typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE]
  for (const raw of list) {
    const code = normalizeLocaleCode(raw)
    if (code) return code
  }
  return DEFAULT_LOCALE
}

export function readStoredLocale() {
  try {
    const stored = normalizeLocaleCode(localStorage.getItem(STORAGE_KEY))
    if (stored) return stored
  } catch {
    /* private mode */
  }
  return null
}

export function resolveInitialLocale() {
  return readStoredLocale() ?? detectBrowserLocale()
}
