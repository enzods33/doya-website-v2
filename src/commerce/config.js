const runtimeEnv = import.meta.env ?? {}

function isAllowedSupabaseUrl(value) {
  try {
    const url = new URL(value)
    // Développement local uniquement : autorise le stack Supabase local
    // (supabase start) servi en http sur 127.0.0.1 / localhost. En build de
    // production, seuls les domaines Supabase hébergés en https sont acceptés.
    if (runtimeEnv.DEV && (url.hostname === '127.0.0.1' || url.hostname === 'localhost')) {
      return true
    }
    if (url.protocol !== 'https:') return false
    return url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.net')
  } catch {
    return false
  }
}

export const supabaseUrl = runtimeEnv.VITE_SUPABASE_URL ?? ''
export const supabaseAnonKey = runtimeEnv.VITE_SUPABASE_ANON_KEY ?? ''
const isNetlifyDemoHost = typeof window !== 'undefined' && (
  window.location.hostname === 'doya-luna-bohemia.netlify.app'
  || window.location.hostname.endsWith('--doya-luna-bohemia.netlify.app')
)

export const demoStoreConfigured = runtimeEnv.VITE_DEMO_STORE === 'true' || isNetlifyDemoHost

export const commerceConfigured = isAllowedSupabaseUrl(supabaseUrl) && supabaseAnonKey.length > 40
// Aperçu local avec contenu publié : les requêtes GET restent disponibles,
// mais aucune action ne doit écrire sur les services réels.
export const readOnlyPreview = runtimeEnv.DEV && runtimeEnv.VITE_READ_ONLY_PREVIEW === 'true'
export const commerceMutationsAllowed = commerceConfigured && !readOnlyPreview
