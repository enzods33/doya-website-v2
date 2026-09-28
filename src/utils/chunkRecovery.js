const RELOAD_KEY = 'doya-stale-chunk-reload'
const RELOAD_WINDOW_MS = 30_000
const HEALTHY_CLEAR_MS = 10_000

function reloadOnce() {
  try {
    const now = Date.now()
    const previous = Number(window.sessionStorage.getItem(RELOAD_KEY) || 0)
    if (previous && now - previous < RELOAD_WINDOW_MS) return false
    window.sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    if (window.__doyaStaleChunkReloading) return false
    window.__doyaStaleChunkReloading = true
  }

  window.location.reload()
  return true
}

export function isChunkLoadError(error) {
  const message = String(error?.message || error || '')
  return /failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module|chunkloaderror|loading chunk .* failed|javascript module script.*mime type/i.test(message)
}

export function recoverFromStaleChunk(error) {
  if (!isChunkLoadError(error)) return false
  return reloadOnce()
}

export function registerChunkRecovery() {
  if (typeof window === 'undefined' || window.__doyaChunkRecoveryRegistered) return
  window.__doyaChunkRecoveryRegistered = true

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadOnce()
  })

  window.setTimeout(() => {
    try {
      window.sessionStorage.removeItem(RELOAD_KEY)
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
  }, HEALTHY_CLEAR_MS)
}
