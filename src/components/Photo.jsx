import { m, useReducedMotion } from 'motion/react'
import { revealMotion } from '../utils/motion.js'

function Photo({ image, className = '', eager = false, ...props }) {
  const reducedMotion = useReducedMotion()
  const imageProps = {
    src: image.src, width: image.width, height: image.height, alt: image.alt,
    loading: eager ? 'eager' : 'lazy', decoding: 'async', className, ...props,
  }
  if (eager || reducedMotion) return <img {...imageProps} />
  return (
    <m.img {...imageProps} {...revealMotion(reducedMotion, { distance: 24, duration: 1 })} />
  )
}

export default Photo
