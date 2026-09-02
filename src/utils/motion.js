export const editorialEase = [0.22, 1, 0.36, 1]

export function revealMotion(reducedMotion, { delay = 0, distance = 22, duration = 0.85 } = {}) {
  return {
    initial: reducedMotion ? false : { opacity: 0, y: distance },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.12 },
    transition: { duration: reducedMotion ? 0 : duration, delay: reducedMotion ? 0 : delay, ease: editorialEase },
  }
}
