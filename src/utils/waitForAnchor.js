// Lazy sections can take several seconds to mount on a mobile connection.
export function waitForAnchor(hash, onReady, { timeout = 15000 } = {}) {
  let observer
  let resizeObserver
  let timer
  const cancel = () => {
    observer?.disconnect()
    resizeObserver?.disconnect()
    clearTimeout(timer)
    for (const event of ['touchstart', 'wheel', 'keydown']) {
      window.removeEventListener(event, cancel)
    }
  }
  const check = () => {
    const target = document.getElementById(hash.slice(1))
    if (!target) return false
    onReady(target)
    return true
  }
  check()
  observer = new MutationObserver(check)
  observer.observe(document.body, { childList: true, subtree: true })
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(check)
    resizeObserver.observe(document.querySelector('main') || document.body)
  }
  timer = setTimeout(cancel, timeout)
  // Do not pull readers back after they have started navigating themselves.
  for (const event of ['touchstart', 'wheel', 'keydown']) {
    window.addEventListener(event, cancel, { passive: true })
  }
  return cancel
}
