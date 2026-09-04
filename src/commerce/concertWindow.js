/** Fenêtre initiale de dates à venir affichées. */
export const CONCERT_WINDOW = 10

/** Nombre max de dates déjà passées si l’avenir ne remplit pas déjà la fenêtre. */
export const PAST_CONCERT_LIMIT = 3

/**
 * Jour calendaire UTC : une date est passée dès le lendemain.
 */
export function isPastDate(isoDate, now = new Date()) {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const concertUtc = Date.parse(`${isoDate}T00:00:00Z`)
  return Number.isFinite(concertUtc) && concertUtc < todayUtc
}

/**
 * Prépare la liste affichée.
 * - replié : jusqu’à 10 à venir (+ jusqu’à 3 passées s’il reste de la place)
 * - déplié (« Voir plus ») : toutes les à venir
 * Les passées restent masquées dès qu’il y a ≥ 10 dates à venir.
 */
export function windowConcerts(
  rows,
  now = new Date(),
  {
    limit = CONCERT_WINDOW,
    pastLimit = PAST_CONCERT_LIMIT,
    expanded = false,
  } = {},
) {
  const list = [...rows].sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date))
    if (byDate !== 0) return byDate
    return String(a.id).localeCompare(String(b.id))
  })

  const past = []
  const upcoming = []
  for (const row of list) {
    if (isPastDate(row.date, now)) past.push(row)
    else upcoming.push(row)
  }

  const hasMore = upcoming.length > limit
  const keptUpcoming = expanded ? upcoming : upcoming.slice(0, Math.max(0, limit))
  const showPast = upcoming.length < limit
  const pastSlots = showPast ? Math.min(Math.max(0, pastLimit), limit - upcoming.length) : 0
  const keptPast = pastSlots > 0 ? past.slice(-pastSlots) : []

  return {
    concerts: [...keptPast, ...keptUpcoming],
    hasMore,
    upcomingCount: upcoming.length,
  }
}

/** Mode billetterie affiché : link | soon | none */
export function concertTicketMode(concert, past = false) {
  if (past) return 'none'
  if (concert.ticketing === 'link' && typeof concert.ticketUrl === 'string' && concert.ticketUrl.startsWith('https://')) {
    return 'link'
  }
  if (concert.ticketing === 'soon') return 'soon'
  return 'none'
}
