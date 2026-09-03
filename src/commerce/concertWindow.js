/**
 * Retire de la liste affichée les dates passées qui sont en tête
 * (ordre chronoologique). Aucun plafond : 30 dates futures restent toutes visibles.
 */
export function isPastDate(isoDate, now = new Date()) {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const concertUtc = Date.parse(`${isoDate}T00:00:00Z`)
  return Number.isFinite(concertUtc) && concertUtc < todayUtc
}

export function windowConcerts(rows, now = new Date()) {
  const list = [...rows].sort((a, b) => {
    const byDate = String(a.date).localeCompare(String(b.date))
    if (byDate !== 0) return byDate
    return String(a.id).localeCompare(String(b.id))
  })

  while (list.length > 0 && isPastDate(list[0].date, now)) {
    list.shift()
  }

  return list
}
