import { siteContent } from '../../data/siteContent.js'
import { album } from '../../data/album.js'
import { media } from '../../data/media.js'
import { Stars } from '../../components/Brand.jsx'
import Photo from '../../components/Photo.jsx'
import { editorialEase } from '../../utils/motion.js'

function Editorial() {
  const reducedMotion = useReducedMotion()
  return (
    <section id="univers" className="editorial-section section-shell" aria-labelledby="editorial-title">
      <h2 id="editorial-title" className="editorial-composition editorial-title">{siteContent.editorialWords.map((word) => <m.span className="editorial-word" key={word}
        initial={reducedMotion ? false : 'hidden'} whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <m.span variants={{ hidden: { y: '115%' }, visible: { y: 0 } }}
          transition={{ duration: reducedMotion ? 0 : 1.1, ease: editorialEase }}>{word}</m.span>
      </m.span>)}</h2>
      <figure className="editorial-photo"><Photo image={media.editorial} /><figcaption className="photo-caption"><span>{siteContent.name}</span><span>{siteContent.year}</span></figcaption></figure>
      <div className="editorial-note"><Stars /><p className="eyebrow">{siteContent.editorialLabel}<br />{album.tracks.length} titres — {album.year}</p><a className="text-link" href="#about">{siteContent.aboutLabel}<span aria-hidden="true">↗</span></a></div>
    </section>
  )
}

export default Editorial
import { m, useReducedMotion } from 'motion/react'
