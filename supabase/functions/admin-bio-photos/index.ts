import { json, preflight, rejectOrigin, corsHeaders } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/admin.ts'
import { serviceClient } from '../_shared/clients.ts'
import { r2DeleteObject, r2PutObject } from '../_shared/r2.ts'

const MAX_BYTES = 4_500_000

function slugFile(name: string) {
  const base = name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return base || 'photo'
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const options = preflight(req)
  if (options) return options
  const blocked = rejectOrigin(req)
  if (blocked) return blocked
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, origin)

  const admin = await requireAdmin(req, origin)
  if (admin instanceof Response) return admin

  const contentType = req.headers.get('content-type') ?? ''
  const db = serviceClient()

  // Upload multipart
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) return json(400, { error: 'invalid_file' }, origin)
    if (file.size <= 0 || file.size > MAX_BYTES) return json(400, { error: 'file_too_large' }, origin)
    // Front prépare déjà en JPEG web (long côté ≤ 1600) ; images seules.
    const mime = (file.type || '').toLowerCase()
    if (mime !== 'image/jpeg' && mime !== 'image/jpg') {
      return json(400, { error: 'invalid_image_type' }, origin)
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const storeMime = 'image/jpeg'
    const key = `bio/web/${Date.now()}-${slugFile(file.name)}.jpg`
    let publicUrl = ''
    try {
      publicUrl = await r2PutObject(key, bytes, storeMime)
    } catch (error) {
      console.error(error)
      return json(502, { error: 'r2_upload_failed' }, origin)
    }

    const width = Number(form.get('width') || 1200)
    const height = Number(form.get('height') || 1600)
    const { data: maxRow } = await db.from('bio_photos').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
    const sortOrder = (maxRow?.sort_order ?? 0) + 10

    const { data, error } = await db.from('bio_photos').insert({
      storage_key: key,
      public_url: publicUrl,
      width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1200,
      height: Number.isFinite(height) && height > 0 ? Math.round(height) : 1600,
      sort_order: sortOrder,
      published: true,
      alt: 'Photographie DOYA — Luna Bohemia.',
    }).select('*').single()

    if (error) return json(500, { error: 'bio_create_failed', detail: error.message }, origin)
    return json(200, { photo: data }, origin)
  }

  let body: {
    action?: string
    id?: string
    published?: boolean
    sort_order?: number
    alt?: string
    order?: { id: string; sort_order: number }[]
    photos?: {
      public_url?: string
      width?: number
      height?: number
      alt?: string
      storage_key?: string
      sort_order?: number
    }[]
  }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' }, origin)
  }

  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'list') {
    const { data, error } = await db
      .from('bio_photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return json(500, { error: 'bio_list_failed' }, origin)
    return json(200, { photos: data ?? [] }, origin)
  }

  if (action === 'import_site') {
    const items = Array.isArray(body.photos) ? body.photos : []
    if (!items.length) return json(400, { error: 'invalid_photos' }, origin)

    const { data: existing, error: existingError } = await db.from('bio_photos').select('storage_key')
    if (existingError) return json(500, { error: 'bio_list_failed' }, origin)
    const known = new Set((existing ?? []).map((row) => row.storage_key))

    let imported = 0
    for (const [index, item] of items.entries()) {
      const publicUrl = typeof item?.public_url === 'string' ? item.public_url.trim() : ''
      if (!publicUrl) continue
      let storageKey = typeof item?.storage_key === 'string' ? item.storage_key.trim() : ''
      if (!storageKey) {
        try {
          const path = new URL(publicUrl).pathname.replace(/^\/+/, '')
          storageKey = path || `bio/web/import-${index}.jpg`
        } catch {
          storageKey = `bio/web/import-${index}.jpg`
        }
      }
      if (known.has(storageKey)) continue

      const width = Number(item?.width)
      const height = Number(item?.height)
      const sortOrder = Number.isFinite(Number(item?.sort_order))
        ? Math.round(Number(item.sort_order))
        : (index + 1) * 10
      const { error } = await db.from('bio_photos').insert({
        storage_key: storageKey,
        public_url: publicUrl,
        width: Number.isFinite(width) && width > 0 ? Math.round(width) : 1200,
        height: Number.isFinite(height) && height > 0 ? Math.round(height) : 1600,
        sort_order: sortOrder,
        published: true,
        alt: typeof item?.alt === 'string' && item.alt.trim()
          ? item.alt.trim()
          : 'Photographie DOYA — Luna Bohemia.',
      })
      if (error) {
        console.error(error)
        return json(500, { error: 'bio_import_failed', detail: error.message }, origin)
      }
      known.add(storageKey)
      imported += 1
    }

    const { data, error } = await db
      .from('bio_photos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return json(500, { error: 'bio_list_failed' }, origin)
    return json(200, { photos: data ?? [], imported }, origin)
  }

  if (action === 'update') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return json(400, { error: 'invalid_id' }, origin)
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.published === 'boolean') patch.published = body.published
    if (typeof body.sort_order === 'number') patch.sort_order = body.sort_order
    if (typeof body.alt === 'string') patch.alt = body.alt.trim() || 'Photographie DOYA — Luna Bohemia.'
    const { data, error } = await db.from('bio_photos').update(patch).eq('id', id).select('*').single()
    if (error) return json(500, { error: 'bio_update_failed' }, origin)
    return json(200, { photo: data }, origin)
  }

  if (action === 'reorder') {
    const order = Array.isArray(body.order) ? body.order : []
    if (!order.length) return json(400, { error: 'invalid_order' }, origin)
    for (const item of order) {
      if (!item?.id || typeof item.sort_order !== 'number') continue
      const { error } = await db.from('bio_photos').update({
        sort_order: item.sort_order,
        updated_at: new Date().toISOString(),
      }).eq('id', item.id)
      if (error) return json(500, { error: 'bio_reorder_failed' }, origin)
    }
    return json(200, { ok: true }, origin)
  }

  if (action === 'delete') {
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return json(400, { error: 'invalid_id' }, origin)
    const { data: photo, error: findError } = await db.from('bio_photos').select('*').eq('id', id).maybeSingle()
    if (findError || !photo) return json(404, { error: 'bio_not_found' }, origin)
    try {
      await r2DeleteObject(photo.storage_key)
    } catch (error) {
      console.error(error)
      // Continue DB delete even if R2 object missing.
    }
    const { error } = await db.from('bio_photos').delete().eq('id', id)
    if (error) return json(500, { error: 'bio_delete_failed' }, origin)
    return json(200, { ok: true }, origin)
  }

  return new Response(JSON.stringify({ error: 'invalid_action' }), {
    status: 400,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
})
