import { concerts, liveContent } from '../../data/live.js'
import { isExternalUrl } from '../../utils/links.js'
import { Stars } from '../../components/Brand.jsx'
import Reveal from '../../components/Reveal.jsx'

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' })

function Live() {
  return (
    <section id="live" className="live-section" aria-labelledby="live-title">
      <div className="section-shell live-layout">
        <Reveal as="h2" id="live-title" className="editorial-title">{liveContent.title}</Reveal>
        <div className="live-content"><p className="eyebrow">{liveContent.label}</p>
          {concerts.length ? <ul className="concerts">{concerts.map((concert) => <li key={concert.id}>
            <time dateTime={concert.date}>{dateFormat.format(new Date(`${concert.date}T12:00:00Z`))}</time><span>{concert.city}</span><span>{concert.venue}</span>
            {isExternalUrl(concert.ticketUrl) ? <a href={concert.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-link">Billets <span aria-hidden="true">↗</span></a> : <span className="availability-note">Billetterie à venir</span>}
          </li>)}</ul> : <div className="live-empty"><p className="live-empty-title">{liveContent.emptyTitle}</p><p>{liveContent.emptyText}</p></div>}
        </div>
        <Stars className="live-stars" />
      </div>
    </section>
  )
}

export default Live
