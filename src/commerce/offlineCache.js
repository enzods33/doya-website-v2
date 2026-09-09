/** Cache local léger pour resservir dates / bio hors ligne après une visite réussie. */

const PREFIX = 'doya-cache:'

export function readCache(key, maxAgeMs = 1000 * 60 * 60 * 24 * 7) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.savedAt !== 'number') return null
    if (Date.now() - parsed.savedAt > maxAgeMs) return null
    return parsed.data ?? null
  } catch {
    return null
  }
}

export function writeCache(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    /* quota / private mode */
  }
}
