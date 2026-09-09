/** Forfaits livraison par zone — tarifs modérés, type boutique merch EU. */
export type ShippingZone = {
  id: string
  displayName: string
  amountCents: number
  countries: string[]
}

export const DEFAULT_SHIPPING_ZONES: ShippingZone[] = [
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

/** @deprecated Préférer loadShippingZones(db) — conservé pour imports existants. */
export const SHIPPING_ZONES = DEFAULT_SHIPPING_ZONES

type ZoneRow = {
  id?: string | null
  display_name?: string | null
  amount_cents?: number | null
  countries?: string[] | null
}

export async function loadShippingZones(db: {
  from: (table: string) => {
    select: (cols: string) => {
      order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: ZoneRow[] | null; error: unknown }>
    }
  }
}): Promise<ShippingZone[]> {
  try {
    const { data, error } = await db
      .from('shipping_zones')
      .select('id, display_name, amount_cents, countries')
      .order('sort_order', { ascending: true })
    if (error || !data?.length) return DEFAULT_SHIPPING_ZONES

    const zones: ShippingZone[] = []
    for (const row of data) {
      const id = typeof row.id === 'string' ? row.id.trim() : ''
      const amountCents = Number(row.amount_cents)
      const countries = Array.isArray(row.countries)
        ? row.countries.map((code) => String(code).trim().toUpperCase()).filter(Boolean)
        : []
      if (!id || !Number.isInteger(amountCents) || amountCents < 0 || !countries.length) continue
      zones.push({
        id,
        displayName: typeof row.display_name === 'string' && row.display_name.trim()
          ? row.display_name.trim()
          : id,
        amountCents,
        countries,
      })
    }
    return zones.length ? zones : DEFAULT_SHIPPING_ZONES
  } catch {
    return DEFAULT_SHIPPING_ZONES
  }
}

export function shippingZoneById(zones: ShippingZone[], id: string | null | undefined): ShippingZone | null {
  if (!id) return null
  return zones.find((zone) => zone.id === id) ?? null
}

export function shippingZoneByCountry(zones: ShippingZone[], country: string | null | undefined): ShippingZone | null {
  if (!country) return null
  const code = country.trim().toUpperCase()
  return zones.find((zone) => zone.countries.includes(code)) ?? null
}

/** Compat : signature historique (zones = DEFAULT). */
export function shippingZoneByIdLegacy(id: string | null | undefined): ShippingZone | null {
  return shippingZoneById(DEFAULT_SHIPPING_ZONES, id)
}

export function shippingZoneByCountryLegacy(country: string | null | undefined): ShippingZone | null {
  return shippingZoneByCountry(DEFAULT_SHIPPING_ZONES, country)
}

export function shippingAmounts(zones: ShippingZone[] = DEFAULT_SHIPPING_ZONES): number[] {
  return zones.map((zone) => zone.amountCents)
}

export function isAllowedShippingAmount(cents: number, zones: ShippingZone[] = DEFAULT_SHIPPING_ZONES): boolean {
  return shippingAmounts(zones).includes(cents)
}

export function stripeShippingOption(zone: ShippingZone, displayName = zone.displayName) {
  return {
    shipping_rate_data: {
      display_name: displayName,
      type: 'fixed_amount' as const,
      fixed_amount: { amount: zone.amountCents, currency: 'eur' },
      metadata: { zone: zone.id },
    },
  }
}
