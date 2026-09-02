import { useState } from 'react'
import { galleryImages } from '../../data/media.js'
import { siteContent } from '../../data/siteContent.js'
import { Stars } from '../../components/Brand.jsx'
import Reveal from '../../components/Reveal.jsx'
import TransitionImage from '../../components/TransitionImage.jsx'

function Photography() {
  const [index, setIndex] = useState(0)
  const total = galleryImages.length
  const previous = (index + total - 1) % total
  const next = (index + 1) % total

  return (
    <section id="photographies" className="photography-section" aria-labelledby="photography-title">
      <div className="section-shell">
        <Reveal as="header" className="gallery-header"><h2 id="photography-title">Photographies</h2><div className="gallery-controls">
          <p className="eyebrow" aria-live="polite" aria-atomic="true"><span>{String(index + 1).padStart(2, '0')}</span><span aria-hidden="true"> — </span><span className="sr-only">sur </span>{String(total).padStart(2, '0')}</p>
          <button type="button" onClick={() => setIndex(previous)} aria-label="Photographie précédente" aria-controls="gallery-main">←</button>
          <button type="button" onClick={() => setIndex(next)} aria-label="Photographie suivante" aria-controls="gallery-main">→</button>
        </div></Reveal>
        <Reveal className="gallery-stage" distance={28} duration={1}>
          <div className="gallery-side gallery-side-left" aria-hidden="true"><TransitionImage image={galleryImages[previous]} alt="" /></div>
          <figure id="gallery-main" className="gallery-main"><TransitionImage image={galleryImages[index]} /><figcaption className="photo-caption"><span>{siteContent.name}</span><span>{siteContent.albumTitle} / {siteContent.year}</span></figcaption></figure>
          <div className="gallery-side gallery-side-right" aria-hidden="true"><TransitionImage image={galleryImages[next]} alt="" /></div>
        </Reveal>
        <Stars className="gallery-stars" />
      </div>
    </section>
  )
}

export default Photography
