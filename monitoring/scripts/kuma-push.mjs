export async function kumaPush(url, { status, msg, ping }) {
  if (!url) {
    console.log(`[kuma disabled] ${status} ${msg}`)
    return { ok: true, skipped: true }
  }
  const target = new URL(url)
  target.searchParams.set('status', status)
  target.searchParams.set('msg', String(msg).slice(0, 200))
  target.searchParams.set('ping', String(Math.max(0, Math.round(ping))))
  const response = await fetch(target, { signal: AbortSignal.timeout(15_000) })
  const body = await response.text()
  if (!response.ok) console.error(`Kuma ${response.status}: ${body.slice(0, 120)}`)
  return { ok: response.ok }
}
