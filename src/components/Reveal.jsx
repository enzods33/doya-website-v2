import { m, useReducedMotion } from 'motion/react'
import { revealMotion } from '../utils/motion.js'

const elements = { div: m.div, header: m.header, h2: m.h2, p: m.p, span: m.span, article: m.article }

function Reveal({ as = 'div', delay = 0, distance = 22, duration = 0.85, children, ...props }) {
  const reducedMotion = useReducedMotion()
  const Element = elements[as]
  return <Element {...props} {...revealMotion(reducedMotion, { delay, distance, duration })}>{children}</Element>
}

export default Reveal
