import { EMAIL_LOGO_PNG_BASE64 } from '../_shared/emailLogoPng.ts'

const PNG_BYTES = Uint8Array.from(atob(EMAIL_LOGO_PNG_BASE64), (c) => c.charCodeAt(0))

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, HEAD, OPTIONS',
        'access-control-max-age': '86400',
      },
    })
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const headers = {
    'content-type': 'image/png',
    'cache-control': 'public, max-age=31536000, immutable',
    'access-control-allow-origin': '*',
  }

  if (req.method === 'HEAD') return new Response(null, { status: 200, headers })
  return new Response(PNG_BYTES, { status: 200, headers })
})
