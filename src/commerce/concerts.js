import { concerts as localConcerts } from '../data/live.js'
import { supabase } from './supabase.js'

export { isPastDate, windowConcerts, concertTicketMode } from './concertWindow.js'

function normalizeTicketing(row, ticketUrl) {
  const raw = typeof row.ticketing === 'string' ? row.ticketing.trim().toLowerCase() : ''
  if (raw === 'link' || raw === 'soon' || raw === 'none') {
    if (raw === 'link' && !ticketUrl) return 'none'
    return raw
  }
  // Rétrocompat : une URL https vaut billetterie en ligne
  if (ticketUrl) return 'link'
  return 'none'
}

function normalizeConcert(row) {
  const country = typeof row.country === 'string' ? row.country.trim().toUpperCase() : ''
  const ticketUrl = typeof row.ticket_url === 'string' && row.ticket_url.startsWith('https://')
    ? row.ticket_url
    : (typeof row.ticketUrl === 'string' && row.ticketUrl.startsWith('https://') ? row.ticketUrl : null)

  return {
    id: row.id,
    date: row.date,
    city: row.city,
    venue: row.venue,
    country: country || null,
    ticketUrl,
    ticketing: normalizeTicketing(row, ticketUrl),
  }
}

/** Charge les dates publiées depuis Supabase ; sinon fallback local (`src/data/live.js`). */
export async function loadConcerts() {
  if (!supabase) return localConcerts.map(normalizeConcert)

  const { data, error } = await supabase
    .from('concerts')
    .select('id, date, city, venue, country, ticket_url, ticketing')
    .eq('published', true)
    .order('date', { ascending: true })

  if (error || !Array.isArray(data) || data.length === 0) {
    return localConcerts.map(normalizeConcert)
  }
  return data.map(normalizeConcert)
}
