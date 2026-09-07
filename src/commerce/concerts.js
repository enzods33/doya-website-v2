import { concerts as localConcerts } from '../data/live.js'

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

function httpsUrl(value) {
  return typeof value === 'string' && value.startsWith('https://') ? value : null
}

function normalizeConcert(row) {
  const country = typeof row.country === 'string' ? row.country.trim().toUpperCase() : ''
  const ticketUrl = httpsUrl(row.ticket_url) ?? httpsUrl(row.ticketUrl)

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
  const { supabase } = await import('./supabase.js')
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
