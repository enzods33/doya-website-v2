/** Forfaits livraison par zone — tarifs modérés, type boutique merch EU. */
export type ShippingZone = {
  id: string
  displayName: string
  amountCents: number
  countries: string[]
}

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'fr',
    displayName: 'France métropole',
    amountCents: 600,
    countries: ['FR', 'MC'],
  },
  {
    id: 'eu',
    displayName: 'Europe (UE + Suisse)',
    amountCents: 800,
    countries: ['BE', 'CH', 'LU', 'DE', 'NL', 'ES', 'IT', 'PT', 'AT', 'IE'],
  },
  {
    id: 'dom',
    displayName: 'DOM-TOM (Réunion, Antilles…)',
    amountCents: 1290,
    countries: ['RE', 'GP', 'MQ', 'GF', 'YT', 'PM', 'BL', 'MF', 'NC', 'PF', 'WF', 'TF'],
  },
]

export function shippingZoneById(id: string | null | undefined): ShippingZone | null {
  if (!id) return null
  return SHIPPING_ZONES.find((zone) => zone.id === id) ?? null
}

export function shippingZoneByCountry(country: string | null | undefined): ShippingZone | null {
  if (!country) return null
  const code = country.trim().toUpperCase()
  return SHIPPING_ZONES.find((zone) => zone.countries.includes(code)) ?? null
}

export function shippingAmounts(): number[] {
  return SHIPPING_ZONES.map((zone) => zone.amountCents)
}

export function isAllowedShippingAmount(cents: number): boolean {
  return shippingAmounts().includes(cents)
}

export function stripeShippingOption(zone: ShippingZone) {
  return {
    shipping_rate_data: {
      display_name: zone.displayName,
      type: 'fixed_amount' as const,
      fixed_amount: { amount: zone.amountCents, currency: 'eur' },
      metadata: { zone: zone.id },
    },
  }
}
