/** Miroir front des zones serveur (`supabase/functions/_shared/shipping.ts`). */
export const DEFAULT_SHIPPING_ZONES = [
  {
    id: 'fr',
    amountCents: 600,
    countries: ['FR', 'MC'],
  },
  {
    id: 'eu',
    amountCents: 800,
    countries: ['BE', 'CH', 'LU', 'DE', 'NL', 'ES', 'IT', 'PT', 'AT', 'IE'],
  },
  {
    id: 'dom',
    amountCents: 1290,
    countries: ['RE', 'GP', 'MQ', 'GF', 'YT', 'PM', 'BL', 'MF', 'NC', 'PF', 'WF', 'TF'],
  },
]

export const SHIPPING_ZONES = DEFAULT_SHIPPING_ZONES

const SHIPPING_COUNTRY_KEY = 'doya-shipping-country'

/** Si la langue n’a pas de région (ex. `fr`), pays par défaut dans les zones couvertes. */
const LANG_DEFAULT_COUNTRY = {
  fr: 'FR',
  es: 'ES',
  pt: 'PT',
  en: 'IE',
}

export function zoneForCountry(country, zones = DEFAULT_SHIPPING_ZONES) {
  const code = String(country ?? '').trim().toUpperCase()
  return zones.find((zone) => zone.countries.includes(code)) ?? null
}

function countriesInZones(zones) {
  return new Set(
    zones.flatMap((zone) => (Array.isArray(zone.countries) ? zone.countries : [])),
  )
}

/** Pays de livraison suggéré : choix mémorisé → région navigateur → langue → FR. */
export function detectShippingCountry(zones = DEFAULT_SHIPPING_ZONES) {
  const allowed = countriesInZones(zones)
  if (!allowed.size) return 'FR'

  try {
    const stored = String(localStorage.getItem(SHIPPING_COUNTRY_KEY) || '').trim().toUpperCase()
    if (stored && allowed.has(stored)) return stored
  } catch {
    /* private mode */
  }

  const languages = typeof navigator !== 'undefined'
    ? (navigator.languages?.length ? navigator.languages : [navigator.language])
    : []

  for (const raw of languages) {
    if (!raw) continue
    const parts = String(raw).replace(/_/g, '-').split('-').filter(Boolean)
    if (parts.length >= 2) {
      const region = parts[parts.length - 1].toUpperCase()
      if (/^[A-Z]{2}$/.test(region) && allowed.has(region)) return region
    }
    const langDefault = LANG_DEFAULT_COUNTRY[parts[0].toLowerCase()]
    if (langDefault && allowed.has(langDefault)) return langDefault
  }

  return allowed.has('FR') ? 'FR' : [...allowed][0]
}

export function rememberShippingCountry(country) {
  const code = String(country ?? '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return
  try {
    localStorage.setItem(SHIPPING_COUNTRY_KEY, code)
  } catch {
    /* private mode */
  }
}

export async function fetchShippingZones() {
  try {
    const { supabase } = await import('./supabase.js')
    if (!supabase) return DEFAULT_SHIPPING_ZONES
    const { data, error } = await supabase
      .from('shipping_zones')
      .select('id, amount_cents, countries')
      .order('sort_order', { ascending: true })
    if (error || !data?.length) return DEFAULT_SHIPPING_ZONES
    const zones = data
      .map((row) => ({
        id: row.id,
        amountCents: Number(row.amount_cents),
        countries: Array.isArray(row.countries)
          ? row.countries.map((code) => String(code).toUpperCase())
          : [],
      }))
      .filter((zone) => zone.id && Number.isInteger(zone.amountCents) && zone.countries.length)
    return zones.length ? zones : DEFAULT_SHIPPING_ZONES
  } catch {
    return DEFAULT_SHIPPING_ZONES
  }
}
