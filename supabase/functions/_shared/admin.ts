import { json } from './http.ts'
import { serviceClient, userClient } from './clients.ts'

export type AdminContext = {
  userId: string
  email: string
  accessToken: string
}

export async function requireAdmin(req: Request, origin: string | null): Promise<AdminContext | Response> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!token || token === anon) return json(401, { error: 'admin_unauthorized' }, origin)

  const { data, error } = await userClient(token).auth.getUser(token)
  if (error || !data.user?.email) return json(401, { error: 'admin_unauthorized' }, origin)

  const email = data.user.email.trim().toLowerCase()
  const admin = serviceClient()
  const { data: allowed, error: allowError } = await admin
    .from('admin_allowlist')
    .select('email')
    .eq('email', email)
    .maybeSingle()

  if (allowError || !allowed) return json(403, { error: 'admin_forbidden' }, origin)

  await admin.from('profiles').upsert({
    id: data.user.id,
    email,
    role: 'admin',
  }, { onConflict: 'id' })

  return {
    userId: data.user.id,
    email,
    accessToken: token,
  }
}
