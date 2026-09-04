import { useEffect, useMemo, useState } from 'react'
import { concertTicketMode, isPastDate, loadConcerts, windowConcerts } from '../../commerce/concerts.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import Reveal from '../../components/Reveal.jsx'

function ConcertTickets({ concert, past, t }) {
  const mode = concertTicketMode(concert, past)
  if (mode === 'link') {
    return (
      <a
        href={concert.ticketUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="concert-tickets"
      >
        {t('live.tickets')}
      </a>
    )
  }
  if (mode === 'soon') {
    return (
      <span className="concert-tickets is-muted is-soon">
        {t('live.ticketsSoon')}
      </span>
    )
  }
  return <span className="concert-tickets-slot" aria-hidden="true" />
}

function Live() {
  const { t, intlLocale } = useI18n()
  const [rows, setRows] = useState([])
  const [ready, setReady] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
    [intlLocale],
  )

  const { concerts, hasMore } = useMemo(
    () => windowConcerts(rows, new Date(), { expanded }),
    [rows, expanded],
  )

  useEffect(() => {
    let active = true
    loadConcerts().then((loaded) => {
      if (!active) return
      setRows(loaded)
      setReady(true)
    })
    return () => { active = false }
  }, [])

  return (
    <section id="live" className="live-section" aria-labelledby="live-title">
      <div className="section-shell live-layout">
        <Reveal as="h2" id="live-title" className="editorial-title">{t('live.title')}</Reveal>
        <div className="live-content">
          <p className="eyebrow">{t('live.label')}</p>
          {!ready ? null : concerts.length ? (
            <>
              <ul className="concerts">
                {concerts.map((concert) => {
                  const past = isPastDate(concert.date)
                  return (
                    <li key={concert.id} className={past ? 'is-past' : undefined}>
                      <time
                        className={past ? 'is-past' : undefined}
                        dateTime={concert.date}
                      >
                        {dateFormat.format(new Date(`${concert.date}T12:00:00Z`))}
                      </time>
                      <span className="concert-place">
                        <span className="concert-city">
                          {concert.city}
                          {concert.country ? (
                            <span className="concert-country-inline">, {concert.country.slice(0, 2)}</span>
                          ) : null}
                        </span>
                        <span className="concert-venue">{concert.venue}</span>
                      </span>
                      <ConcertTickets concert={concert} past={past} t={t} />
                    </li>
                  )
                })}
              </ul>
              {hasMore && !expanded ? (
                <p className="live-more">
                  <button type="button" className="text-link" onClick={() => setExpanded(true)}>
                    {t('live.seeMore')} <span aria-hidden="true">↓</span>
                  </button>
                </p>
              ) : null}
            </>
          ) : (
            <div className="live-empty">
              <p className="live-empty-title">{t('live.emptyTitle')}</p>
              <p>{t('live.emptyText')}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Live
