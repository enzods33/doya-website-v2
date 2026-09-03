import { LOCAL_ORIGINS } from './limits.ts'

export function siteOrigins(): string[] {
  const configured = (Deno.env.get('SITE_URL') ?? '')
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter((value) => {
      try {
        const url = new URL(value)
        return url.protocol === 'https:' || LOCAL_ORIGINS.includes(value)
      } catch {
        return false
      }
    })
  return [...new Set([...LOCAL_ORIGINS, ...configured])]
}

export function publicSiteUrl(): string {
  const httpsOrigin = siteOrigins().find((origin) => origin.startsWith('https://'))
  if (httpsOrigin) return httpsOrigin
  if (Deno.env.get('DENO_DEPLOYMENT_ID') || Deno.env.get('ENV') === 'production') {
    throw new Error('SITE_URL_required')
  }
  return LOCAL_ORIGINS[0]
}

export function corsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && siteOrigins().includes(origin.replace(/\/$/, ''))
    ? origin.replace(/\/$/, '')
    : siteOrigins()[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export function json(status: number, body: Record<string, unknown>, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

export function preflight(req: Request): Response | null {
  if (req.method !== 'OPTIONS') return null
  return new Response('ok', { headers: corsHeaders(req.headers.get('origin')) })
}

export function rejectOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin')
  if (!origin) return json(403, { error: 'origin_required' }, null)
  const normalized = origin.replace(/\/$/, '')
  if (!siteOrigins().includes(normalized)) return json(403, { error: 'origin_not_allowed' }, origin)
  return null
}
