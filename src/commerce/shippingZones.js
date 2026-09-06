/** Miroir front des zones serveur (`supabase/functions/_shared/shipping.ts`). */
export const SHIPPING_ZONES = [
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

export function zoneForCountry(country) {
  const code = String(country ?? '').trim().toUpperCase()
  return SHIPPING_ZONES.find((zone) => zone.countries.includes(code)) ?? null
}

export function shippingCountries() {
  return SHIPPING_ZONES.flatMap((zone) => zone.countries.map((code) => ({ code, zoneId: zone.id, amountCents: zone.amountCents })))
}
