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
  if (!past && concert.ticketing === 'none') {
    return (
      <span className="concert-tickets is-muted is-free">
        {t('live.freeEntry')}
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
  const monthFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { month: 'long', timeZone: 'UTC' }),
    [intlLocale],
  )

  const { concerts, hasMore } = useMemo(
    () => windowConcerts(rows, new Date(), { expanded }),
    [rows, expanded],
  )
  const nextConcert = concerts.find((concert) => !isPastDate(concert.date)) ?? null
  const tourConcerts = concerts
  const nextDate = nextConcert ? new Date(`${nextConcert.date}T12:00:00Z`) : null

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
          {!ready ? null : concerts.length ? (
            <>
              {nextConcert && nextDate ? (
                <Reveal as="article" className="live-featured" delay={0.08} distance={28} duration={1}>
                  <div className="live-featured-date">
                    <p className="eyebrow">{t('live.nextDate')}</p>
                    <time dateTime={nextConcert.date}>
                      <span className="live-featured-day">{String(nextDate.getUTCDate()).padStart(2, '0')}</span>
                      <span className="live-featured-date-copy">
                        <span className="live-featured-month">{monthFormat.format(nextDate)}</span>
                        <span className="live-featured-year">{nextDate.getUTCFullYear()}</span>
                      </span>
                    </time>
                  </div>
                  <div className="live-featured-place">
                    <p className="live-featured-city">
                      {nextConcert.city}
                      {nextConcert.country ? <span>, {nextConcert.country.slice(0, 2)}</span> : null}
                    </p>
                    <p className="live-featured-venue">{nextConcert.venue}</p>
                  </div>
                  <ConcertTickets concert={nextConcert} past={false} t={t} />
                </Reveal>
              ) : null}
              {tourConcerts.length ? (
                <>
                  <p className="eyebrow live-tour-label">{t('live.label')}</p>
                  <ul className="concerts">
                    {tourConcerts.map((concert) => {
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
                </>
              ) : null}
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
