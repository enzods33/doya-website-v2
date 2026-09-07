import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  return json(200, { ok: true, email: admin.email, userId: admin.userId }, origin)
})
