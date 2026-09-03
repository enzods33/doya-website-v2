import { useMemo } from 'react'
import { concerts } from '../../data/live.js'
import { isExternalUrl } from '../../utils/links.js'
import { useI18n } from '../../i18n/I18nProvider.jsx'
import { Stars } from '../../components/Brand.jsx'
import Reveal from '../../components/Reveal.jsx'

function Live() {
  const { t, intlLocale } = useI18n()
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' }),
    [intlLocale],
  )

  return (
    <section id="live" className="live-section" aria-labelledby="live-title">
      <div className="section-shell live-layout">
        <Reveal as="h2" id="live-title" className="editorial-title">{t('live.title')}</Reveal>
        <div className="live-content"><p className="eyebrow">{t('live.label')}</p>
          {concerts.length ? <ul className="concerts">{concerts.map((concert) => <li key={concert.id}>
            <time dateTime={concert.date}>{dateFormat.format(new Date(`${concert.date}T12:00:00Z`))}</time><span>{concert.city}</span><span>{concert.venue}</span>
            {isExternalUrl(concert.ticketUrl) ? <a href={concert.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-link">{t('live.tickets')} <span aria-hidden="true">↗</span></a> : <span className="availability-note">{t('live.ticketsSoon')}</span>}
          </li>)}</ul> : <div className="live-empty"><p className="live-empty-title">{t('live.emptyTitle')}</p><p>{t('live.emptyText')}</p></div>}
        </div>
        <Stars className="live-stars" />
      </div>
    </section>
  )
}

export default Live
