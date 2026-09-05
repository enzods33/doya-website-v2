function isAllowedSupabaseUrl(value) {
  try {
    const url = new URL(value)
    // Développement local uniquement : autorise le stack Supabase local
    // (supabase start) servi en http sur 127.0.0.1 / localhost. En build de
    // production, seuls les domaines Supabase hébergés en https sont acceptés.
    if (import.meta.env?.DEV && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')) {
      return true
    }
    if (url.protocol !== 'https:') return false
    return url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.net')
  } catch {
    return false
  }
}

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const commerceConfigured = isAllowedSupabaseUrl(supabaseUrl) && supabaseAnonKey.length > 40
