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

export function zoneForCountry(country, zones = DEFAULT_SHIPPING_ZONES) {
  const code = String(country ?? '').trim().toUpperCase()
  return zones.find((zone) => zone.countries.includes(code)) ?? null
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
