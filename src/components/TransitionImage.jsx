import { AnimatePresence, m, useIsPresent, useReducedMotion } from 'motion/react'
import { editorialEase } from '../utils/motion.js'

function FadingImage(props) {
  const isPresent = useIsPresent()
  return <m.img {...props} aria-hidden={!isPresent || undefined}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    transition={{ duration: 0.48, ease: editorialEase }} />
}

// The grid keeps both frames in the same reserved space during the crossfade.
function TransitionImage({ image, className = '', alt = image.alt }) {
  const reducedMotion = useReducedMotion()
  const props = { src: image.src, width: image.width, height: image.height, alt, loading: 'lazy', decoding: 'async' }
  return <div className={`image-transition ${className}`}>
    {reducedMotion ? <img {...props} /> : <AnimatePresence initial={false}><FadingImage key={image.src} {...props} /></AnimatePresence>}
  </div>
}

export default TransitionImage
