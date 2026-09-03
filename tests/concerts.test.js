import test from 'node:test'
import assert from 'node:assert/strict'
import { isPastDate, windowConcerts } from '../src/commerce/concertWindow.js'

test('isPastDate compare en UTC jour calendaire', () => {
  const now = new Date('2026-10-18T10:00:00Z')
  assert.equal(isPastDate('2026-10-17', now), true)
  assert.equal(isPastDate('2026-10-18', now), false)
  assert.equal(isPastDate('2026-10-19', now), false)
})

test('windowConcerts retire seulement les dates passées en tête', () => {
  const now = new Date('2026-10-20T12:00:00Z')
  const rows = [
    { id: '1', date: '2026-10-17', city: 'Tarbes', venue: 'Audentia', ticketUrl: null },
    { id: '2', date: '2026-10-19', city: 'Pau', venue: 'Zénith', ticketUrl: null },
    { id: '3', date: '2026-11-01', city: 'Lyon', venue: 'Hall', ticketUrl: null },
  ]

  const visible = windowConcerts(rows, now)
  assert.deepEqual(visible.map((row) => row.id), ['3'])
})

test('windowConcerts garde toutes les dates futures sans plafond', () => {
  const now = new Date('2026-09-01T12:00:00Z')
  const rows = Array.from({ length: 30 }, (_, index) => ({
    id: String(index + 1),
    date: `2027-01-${String(index + 1).padStart(2, '0')}`,
    city: 'Ville',
    venue: 'Salle',
    ticketUrl: null,
  }))

  assert.equal(windowConcerts(rows, now).length, 30)
})
