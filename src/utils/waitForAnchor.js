// Lazy sections can take several seconds to mount on a mobile connection.
export function waitForAnchor(hash, onReady, { timeout = 15000 } = {}) {
  let observer
  let timer
  const cancel = () => {
    observer?.disconnect()
    clearTimeout(timer)
    for (const event of ['touchstart', 'wheel', 'keydown']) {
      window.removeEventListener(event, cancel)
    }
  }
  const check = () => {
    const target = document.getElementById(hash.slice(1))
    if (!target) return false
    cancel()
    onReady(target)
    return true
  }
  if (check()) return cancel
  observer = new MutationObserver(check)
  observer.observe(document.body, { childList: true, subtree: true })
  timer = setTimeout(cancel, timeout)
  // Do not pull readers back after they have started navigating themselves.
  for (const event of ['touchstart', 'wheel', 'keydown']) {
    window.addEventListener(event, cancel, { passive: true })
  }
  return cancel
}
