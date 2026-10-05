export function createReadOnlyPreviewFetch({ origin, tables, fetchImpl = globalThis.fetch }) {
  const expectedOrigin = new URL(origin).origin
  const allowedTables = new Set(tables)

  return function readOnlyPreviewFetch(input, init) {
    // Rebuild even an existing Request so an init.method override is assessed.
    const request = new Request(input, init)
    const url = new URL(request.url)
    const path = url.pathname.split('/').filter(Boolean)
    const allowed = (request.method === 'GET' || request.method === 'HEAD')
      && url.origin === expectedOrigin
      && path.length === 3
      && path[0] === 'rest'
      && path[1] === 'v1'
      && allowedTables.has(path[2])

    if (!allowed) return Promise.reject(new Error('read_only_preview'))
    return fetchImpl(input, init)
  }
}
