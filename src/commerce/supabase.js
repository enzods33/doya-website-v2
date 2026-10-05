import { createClient } from '@supabase/supabase-js'
import { commerceConfigured, readOnlyPreview, supabaseAnonKey, supabaseUrl } from './config.js'
import { createReadOnlyPreviewFetch } from './readOnlyPreviewFetch.js'

const readOnlyTables = new Set([
  'bio_photos',
  'catalog_auto_promos',
  'catalog_products',
  'catalog_variants',
  'concerts',
  'shipping_zones',
  'site_bio',
  'site_featured_clip',
])

const readOnlyPreviewFetch = readOnlyPreview && commerceConfigured
  ? createReadOnlyPreviewFetch({
    origin: supabaseUrl,
    tables: readOnlyTables,
  })
  : undefined

export const supabase = commerceConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    global: readOnlyPreviewFetch ? { fetch: readOnlyPreviewFetch } : undefined,
    auth: {
      persistSession: !readOnlyPreview,
      autoRefreshToken: !readOnlyPreview,
      detectSessionInUrl: !readOnlyPreview,
      flowType: 'pkce',
    },
  })
  : null
