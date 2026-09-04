import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CONCERT_WINDOW,
  PAST_CONCERT_LIMIT,
  concertTicketMode,
  isPastDate,
  windowConcerts,
} from '../src/commerce/concertWindow.js'

test('isPastDate compare en UTC jour calendaire', () => {
  const now = new Date('2026-10-18T10:00:00Z')
  assert.equal(isPastDate('2026-10-17', now), true)
  assert.equal(isPastDate('2026-10-18', now), false)
  assert.equal(isPastDate('2026-10-19', now), false)
})

test('windowConcerts masque les passées si 10 dates à venir ou plus', () => {
  const now = new Date('2026-09-04T12:00:00Z')
  const past = Array.from({ length: 4 }, (_, index) => ({
    id: `p${index + 1}`,
    date: `2026-0${index + 5}-10`,
    city: 'Ville',
    venue: 'Salle',
    country: 'FR',
    ticketUrl: null,
    ticketing: 'none',
  }))
  const upcoming = Array.from({ length: 12 }, (_, index) => ({
    id: `f${index + 1}`,
    date: `2026-09-${String(index + 5).padStart(2, '0')}`,
    city: 'Ville',
    venue: 'Salle',
    country: 'FR',
    ticketUrl: null,
    ticketing: 'none',
  }))

  const visible = windowConcerts([...past, ...upcoming], now)
  assert.equal(visible.concerts.length, CONCERT_WINDOW)
  assert.equal(visible.hasMore, true)
  assert.equal(visible.concerts.filter((row) => isPastDate(row.date, now)).length, 0)
  assert.deepEqual(visible.concerts.map((row) => row.id), Array.from({ length: 10 }, (_, i) => `f${i + 1}`))
})

test('windowConcerts expanded montre toutes les dates à venir', () => {
  const now = new Date('2026-09-04T12:00:00Z')
  const upcoming = Array.from({ length: 12 }, (_, index) => ({
    id: `f${index + 1}`,
    date: `2026-09-${String(index + 5).padStart(2, '0')}`,
    city: 'Ville',
    venue: 'Salle',
    country: 'FR',
    ticketUrl: null,
    ticketing: 'none',
  }))
  const past = [
    { id: 'p1', date: '2026-08-01', city: 'A', venue: 'S', country: 'FR', ticketUrl: null, ticketing: 'none' },
  ]

  const visible = windowConcerts([...past, ...upcoming], now, { expanded: true })
  assert.equal(visible.concerts.length, 12)
  assert.equal(visible.hasMore, true)
  assert.equal(visible.concerts.some((row) => row.id === 'p1'), false)
  assert.equal(visible.concerts.at(-1).id, 'f12')
})

test('windowConcerts garde jusqu’à 3 passées s’il reste de la place', () => {
  const now = new Date('2026-09-04T12:00:00Z')
  const rows = [
    { id: 'p1', date: '2026-06-01', city: 'A', venue: 'S', country: 'FR', ticketing: 'none', ticketUrl: null },
    { id: 'p2', date: '2026-07-01', city: 'B', venue: 'S', country: 'FR', ticketing: 'none', ticketUrl: null },
    { id: 'p3', date: '2026-08-01', city: 'C', venue: 'S', country: 'FR', ticketing: 'none', ticketUrl: null },
    { id: 'p4', date: '2026-08-15', city: 'D', venue: 'S', country: 'FR', ticketing: 'none', ticketUrl: null },
    { id: 'p5', date: '2026-08-29', city: 'E', venue: 'S', country: 'FR', ticketing: 'none', ticketUrl: null },
    { id: 'f1', date: '2026-09-10', city: 'F', venue: 'S', country: 'FR', ticketing: 'none', ticketUrl: null },
    { id: 'f2', date: '2026-10-17', city: 'G', venue: 'Audentia', country: 'FR', ticketing: 'link', ticketUrl: 'https://example.com' },
  ]
  const visible = windowConcerts(rows, now)
  assert.deepEqual(visible.concerts.map((row) => row.id), ['p3', 'p4', 'p5', 'f1', 'f2'])
  assert.equal(visible.hasMore, false)
  assert.equal(visible.concerts.filter((row) => isPastDate(row.date, now)).length, PAST_CONCERT_LIMIT)
})

test('windowConcerts garde les dates passées (≤3) pour la rayure front', () => {
  const now = new Date('2026-09-04T12:00:00Z')
  const rows = [
    { id: '1', date: '2026-08-01', city: 'A', venue: 'S', country: 'FR', ticketUrl: null, ticketing: 'none' },
    { id: '2', date: '2026-09-10', city: 'B', venue: 'S', country: 'ES', ticketUrl: null, ticketing: 'none' },
    { id: '3', date: '2026-10-01', city: 'C', venue: 'S', country: 'PO', ticketUrl: null, ticketing: 'none' },
  ]
  const visible = windowConcerts(rows, now)
  assert.deepEqual(visible.concerts.map((row) => row.id), ['1', '2', '3'])
  assert.equal(isPastDate(visible.concerts[0].date, now), true)
  assert.equal(isPastDate(visible.concerts[1].date, now), false)
})

test('concertTicketMode : link, soon, none', () => {
  assert.equal(
    concertTicketMode({ ticketing: 'link', ticketUrl: 'https://tickets.example/1' }, false),
    'link',
  )
  assert.equal(concertTicketMode({ ticketing: 'soon', ticketUrl: null }, false), 'soon')
  assert.equal(concertTicketMode({ ticketing: 'none', ticketUrl: null }, false), 'none')
  assert.equal(
    concertTicketMode({ ticketing: 'link', ticketUrl: 'https://tickets.example/1' }, true),
    'none',
  )
  assert.equal(concertTicketMode({ ticketing: 'soon', ticketUrl: null }, true), 'none')
})
