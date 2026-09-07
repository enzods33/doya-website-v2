import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { serviceClient } from '../_shared/clients.ts'

type ConcertBody = {
  action?: string
  id?: string
  date?: string
  city?: string
  venue?: string
  country?: string | null
  ticketing?: string
  ticket_url?: string | null
  published?: boolean
}

function sanitizeConcert(input: ConcertBody) {
  const date = typeof input.date === 'string' ? input.date.trim() : ''
  const city = typeof input.city === 'string' ? input.city.trim() : ''
  const venue = typeof input.venue === 'string' ? input.venue.trim() : ''
  const countryRaw = typeof input.country === 'string' ? input.country.trim().toUpperCase() : ''
  const country = countryRaw ? countryRaw : null
  const ticketing = typeof input.ticketing === 'string' ? input.ticketing.trim().toLowerCase() : 'none'
  const ticketUrl = typeof input.ticket_url === 'string' && input.ticket_url.trim()
    ? input.ticket_url.trim()
    : null
  const published = input.published !== false

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'invalid_date' as const }
  if (!city || !venue) return { error: 'invalid_concert' as const }
  if (country && !/^[A-Z]{2,3}$/.test(country)) return { error: 'invalid_country' as const }
  if (!['link', 'soon', 'none'].includes(ticketing)) return { error: 'invalid_ticketing' as const }
  if (ticketing === 'link' && (!ticketUrl || !ticketUrl.startsWith('https://'))) {
    return { error: 'invalid_ticket_url' as const }
  }

  return {
    row: {
      date,
      city,
      venue,
      country,
      ticketing,
      ticket_url: ticketing === 'link' ? ticketUrl : null,
      published,
    },
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  let body: ConcertBody
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const action = typeof body.action === 'string' ? body.action : ''
  const db = serviceClient()

  if (action === 'list') {
    const { data, error } = await db
      .from('concerts')
      .select('id, date, city, venue, country, ticket_url, ticketing, published, created_at')
      .order('date', { ascending: true })
    if (error) return json(500, { error: 'concerts_list_failed' }, origin)
    return json(200, { concerts: data ?? [] }, origin)
  }

  if (action === 'create') {
    const parsed = sanitizeConcert(body)
    if ('error' in parsed) return json(400, { error: parsed.error }, origin)
    const { data, error } = await db.from('concerts').insert(parsed.row).select('*').single()
    if (error) return json(500, { error: 'concerts_create_failed', detail: error.message }, origin)
    return json(200, { concert: data }, origin)
  }

  if (action === 'update') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return json(400, { error: 'invalid_id' }, origin)
    const parsed = sanitizeConcert(body)
    if ('error' in parsed) return json(400, { error: parsed.error }, origin)
    const { data, error } = await db.from('concerts').update(parsed.row).eq('id', id).select('*').single()
    if (error) return json(500, { error: 'concerts_update_failed', detail: error.message }, origin)
    return json(200, { concert: data }, origin)
  }

  if (action === 'delete') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return json(400, { error: 'invalid_id' }, origin)
    const { error } = await db.from('concerts').delete().eq('id', id)
    if (error) return json(500, { error: 'concerts_delete_failed' }, origin)
    return json(200, { ok: true }, origin)
  }

  return json(400, { error: 'invalid_action' }, origin)
})
