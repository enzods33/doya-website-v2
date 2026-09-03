function isAllowedSupabaseUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    return url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.net')
  } catch {
    return false
  }
}

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const commerceConfigured = isAllowedSupabaseUrl(supabaseUrl) && supabaseAnonKey.length > 40
