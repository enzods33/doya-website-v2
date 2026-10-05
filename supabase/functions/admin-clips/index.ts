import { json, preflight, rejectOrigin } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { serviceClient } from '../_shared/clients.ts'
import { handleClipAction } from './handler.js'

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }
  const result = await handleClipAction(body, {
    readClip: () => serviceClient().from('site_featured_clip').select('enabled, title, video_url').eq('id', true).maybeSingle(),
    saveClip: (row: { id: boolean, enabled: boolean, title: string, video_url: string, updated_at: string }) => serviceClient().from('site_featured_clip').upsert(row).select('enabled, title, video_url').single(),
  })
  return json(result.status, result.body, origin)
})
