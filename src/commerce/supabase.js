import { createClient } from '@supabase/supabase-js'
import { commerceConfigured, supabaseAnonKey, supabaseUrl } from './config.js'

export const supabase = commerceConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  })
  : null
