import { m, useReducedMotion } from 'motion/react'
import { revealMotion } from '../utils/motion.js'

function Photo({ image, className = '', eager = false, ...props }) {
  const reducedMotion = useReducedMotion()
  const imageProps = {
    src: image.src, srcSet: image.srcSet, sizes: image.sizes,
    width: image.width, height: image.height, alt: image.alt,
    loading: eager ? 'eager' : 'lazy', decoding: 'async', className, ...props,
  }
  const photo = eager || reducedMotion
    ? <img {...imageProps} />
    : <m.img {...imageProps} {...revealMotion(reducedMotion, { distance: 24, duration: 1 })} />
  return image.mobile ? (
    <picture>
      <source media={image.mobile.media} type={image.mobile.type} srcSet={image.mobile.srcSet} sizes={image.mobile.sizes} />
      {photo}
    </picture>
  ) : photo
}

export default Photo
