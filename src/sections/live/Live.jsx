import { useEffect, useMemo, useState } from 'react'
import { isPastDate, loadConcerts } from '../../commerce/concerts.js'
import { isExternalUrl } from '../../utils/links.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Stars } from '../../components/Brand.jsx'
import Reveal from '../../components/Reveal.jsx'

function Live() {
  const { t, intlLocale } = useI18n()
  const [concerts, setConcerts] = useState([])
  const [ready, setReady] = useState(false)

  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
    [intlLocale],
  )

  useEffect(() => {
    let active = true
    loadConcerts().then((rows) => {
      if (!active) return
      setConcerts(rows)
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
                    <span className="concert-city">{concert.city}</span>
                    <span className="concert-venue">{concert.venue}</span>
                    {isExternalUrl(concert.ticketUrl) && !past
                      ? (
                        <a
                          href={concert.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="concert-tickets"
                        >
                          {t('live.tickets')}
                        </a>
                      )
                      : (
                        <span className={`concert-tickets is-muted${past ? ' is-past' : ''}`}>
                          {past ? t('live.tickets') : t('live.ticketsSoon')}
                        </span>
                      )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="live-empty">
              <p className="live-empty-title">{t('live.emptyTitle')}</p>
              <p>{t('live.emptyText')}</p>
            </div>
          )}
        </div>
        <Stars className="live-stars" />
      </div>
    </section>
  )
}

export default Live
