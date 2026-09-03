import { concerts as localConcerts } from '../data/live.js'
import { supabase } from './supabase.js'
import { windowConcerts } from './concertWindow.js'

export { isPastDate, windowConcerts } from './concertWindow.js'

function normalizeConcert(row) {
  return {
    id: row.id,
    date: row.date,
    city: row.city,
    venue: row.venue,
    ticketUrl: typeof row.ticket_url === 'string' && row.ticket_url.startsWith('https://')
      ? row.ticket_url
      : null,
  }
}

/** Charge les dates publiées depuis Supabase ; sinon fallback local (`src/data/live.js`). */
export async function loadConcerts() {
  if (!supabase) return windowConcerts(localConcerts)

  const { data, error } = await supabase
    .from('concerts')
    .select('id, date, city, venue, ticket_url')
    .eq('published', true)
    .order('date', { ascending: true })

  if (error || !Array.isArray(data)) return windowConcerts(localConcerts)
  return windowConcerts(data.map(normalizeConcert))
}
