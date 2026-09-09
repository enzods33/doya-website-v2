import { commerceConfigured, supabaseAnonKey, supabaseUrl } from './config.js'
import { supabase } from './supabase.js'

async function adminInvoke(path, body, { formData } = {}) {
  if (!commerceConfigured || !supabase) throw new Error('commerce_disabled')
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('admin_unauthorized')

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token}`,
  }
  if (!formData) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
    method: 'POST',
    headers,
    body: formData ? formData : JSON.stringify(body ?? {}),
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(json.error ?? 'request_failed')
    error.status = response.status
    error.detail = json.detail
    throw error
  }
  return json
}

export function adminAuthCheck() {
  return adminInvoke('admin-auth-check', {})
}

export function adminConcerts(action, payload = {}) {
  return adminInvoke('admin-concerts', { action, ...payload })
}

export function adminBioPhotos(action, payload = {}) {
  return adminInvoke('admin-bio-photos', { action, ...payload })
}

export function adminBioUpload(file, { width, height } = {}) {
  const form = new FormData()
  form.append('file', file)
  if (width) form.append('width', String(width))
  if (height) form.append('height', String(height))
  return adminInvoke('admin-bio-photos', null, { formData: form })
}

export function adminBrevo(action, payload = {}) {
  return adminInvoke('admin-brevo-campaign', { action, ...payload })
}

export function adminStats(action = 'overview', payload = {}) {
  return adminInvoke('admin-stats', { action, ...payload })
}

export function adminShopUpload(file, { width, height, side = 'front', productId = 'product' } = {}) {
  const form = new FormData()
  form.append('file', file)
  form.append('side', side)
  form.append('productId', productId)
  if (width) form.append('width', String(width))
  if (height) form.append('height', String(height))
  return adminInvoke('admin-stats', null, { formData: form })
}

export async function signInAdminGoogle() {
  if (!supabase) throw new Error('commerce_disabled')
  const redirectTo = `${window.location.origin}/admin`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) throw error
}

export async function signOutAdmin() {
  if (!supabase) return
  await supabase.auth.signOut()
}
