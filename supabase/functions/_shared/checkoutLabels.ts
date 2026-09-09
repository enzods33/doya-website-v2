/** Libellés Stripe Checkout — alignés sur `shop.product.*` / `shop.color.*` i18n. */

export type CheckoutLocale = 'fr' | 'es' | 'en' | 'pt'

const PRODUCT_BASE: Record<CheckoutLocale, Record<string, string>> = {
  fr: {
    'luna-bohemia-white': 'Étoiles',
    'luna-bohemia-black': 'Étoiles',
    'doya-white': 'Phases',
    'doya-black': 'Phases',
    'cd-luna-bohemia': 'Luna Bohemia',
  },
  en: {
    'luna-bohemia-white': 'Stars',
    'luna-bohemia-black': 'Stars',
    'doya-white': 'Phases',
    'doya-black': 'Phases',
    'cd-luna-bohemia': 'Luna Bohemia',
  },
  es: {
    'luna-bohemia-white': 'Estrellas',
    'luna-bohemia-black': 'Estrellas',
    'doya-white': 'Fases',
    'doya-black': 'Fases',
    'cd-luna-bohemia': 'Luna Bohemia',
  },
  pt: {
    'luna-bohemia-white': 'Estrelas',
    'luna-bohemia-black': 'Estrelas',
    'doya-white': 'Fases',
    'doya-black': 'Fases',
    'cd-luna-bohemia': 'Luna Bohemia',
  },
}

const COLOR: Record<CheckoutLocale, Record<string, string>> = {
  fr: { white: 'Blanc', black: 'Noir', digipack: 'Digipack' },
  en: { white: 'White', black: 'Black', digipack: 'Digipack' },
  es: { white: 'Blanco', black: 'Negro', digipack: 'Digipack' },
  pt: { white: 'Branco', black: 'Preto', digipack: 'Digipack' },
}

const SIZE_LABEL: Record<CheckoutLocale, string> = {
  fr: 'Taille',
  en: 'Size',
  es: 'Talla',
  pt: 'Tamanho',
}

const SHIPPING_NAME: Record<CheckoutLocale, Record<string, string>> = {
  fr: {
    fr: 'France métropole',
    eu: 'Europe (UE + Suisse)',
    dom: 'DOM-TOM (Réunion, Antilles…)',
  },
  en: {
    fr: 'Mainland France',
    eu: 'Europe (EU + Switzerland)',
    dom: 'French overseas (Réunion, Antilles…)',
  },
  es: {
    fr: 'Francia metropolitana',
    eu: 'Europa (UE + Suiza)',
    dom: 'Ultramar francés (Reunión, Antillas…)',
  },
  pt: {
    fr: 'França continental',
    eu: 'Europa (UE + Suíça)',
    dom: 'Ultramar francês (Reunião, Antilhas…)',
  },
}

export function normalizeCheckoutLocale(value: unknown): CheckoutLocale {
  const code = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (code === 'es' || code === 'en' || code === 'pt') return code
  return 'fr'
}

/** Locale Stripe Checkout Session (API). */
export function stripeCheckoutLocale(locale: CheckoutLocale): CheckoutLocale {
  return locale
}

function colorKey(productId: string): 'white' | 'black' | 'digipack' {
  if (productId === 'cd-luna-bohemia') return 'digipack'
  if (productId.endsWith('-black')) return 'black'
  return 'white'
}

export function stripeProductName(productId: string, locale: CheckoutLocale, fallback = ''): string {
  const base = PRODUCT_BASE[locale][productId] ?? fallback ?? productId
  const color = COLOR[locale][colorKey(productId)]
  return `${base} — ${color}`
}

export function stripeLineDescription(size: string, locale: CheckoutLocale): string {
  if (size === 'CD' || size === 'U') return COLOR[locale].digipack
  if (size === 'VINYL') return SIZE_LABEL[locale] === 'Size' ? 'Vinyl' : 'Vinyle'
  if (size === 'ENF') {
    const labels: Record<CheckoutLocale, string> = {
      fr: 'Taille enfant',
      en: 'Kids size',
      es: 'Talla infantil',
      pt: 'Tamanho criança',
    }
    return labels[locale]
  }
  return `${SIZE_LABEL[locale]} ${size}`
}

export function stripeShippingDisplayName(zoneId: string, locale: CheckoutLocale, fallback: string): string {
  return SHIPPING_NAME[locale][zoneId] ?? fallback
}
