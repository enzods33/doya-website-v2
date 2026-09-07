/** Rate-limit : Postgres partagé (preferé) + fallback mémoire par isolate. */

export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim()
  if (cf) return cf
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (forwarded) return forwarded
  const real = req.headers.get('x-real-ip')?.trim()
  if (real) return real
  return 'unknown'
}

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/** Fallback mémoire (si RPC indisponible). */
export function allowRateMemory(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const row = buckets.get(key)
  if (!row || now >= row.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (row.count >= max) return false
  row.count += 1
  return true
}

/** @deprecated alias — préférer allowRatePersistent */
export function allowRate(key: string, max: number, windowMs: number): boolean {
  return allowRateMemory(key, max, windowMs)
}

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message?: string } | null }>
}

/** Rate-limit durable via `consume_rate_limit` (service_role). */
export async function allowRatePersistent(
  admin: RpcClient | null,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  if (admin) {
    try {
      const { data, error } = await admin.rpc('consume_rate_limit', {
        p_key: key,
        p_max: max,
        p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
      })
      if (!error) return data === true
      console.error('consume_rate_limit', error.message)
    } catch (error) {
      console.error('consume_rate_limit', error)
    }
  }
  return allowRateMemory(key, max, windowMs)
}

export function maskEmail(email: string): string {
  const value = String(email || '').trim().toLowerCase()
  const at = value.indexOf('@')
  if (at < 1) return '***'
  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  if (!domain) return '***'
  const keep = local.slice(0, Math.min(2, local.length))
  return `${keep}***@${domain}`
}
