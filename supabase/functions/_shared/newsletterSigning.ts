import { serviceClient } from './clients.ts'

type AdminClient = ReturnType<typeof serviceClient>

export async function newsletterSigningSecret(admin: AdminClient): Promise<string> {
  const { data, error } = await admin
    .from('newsletter_signing_keys')
    .select('secret')
    .eq('id', 'unsubscribe-v1')
    .maybeSingle()

  const secret = typeof data?.secret === 'string' ? data.secret.trim() : ''
  if (error || !secret) throw error ?? new Error('newsletter_signing_secret_missing')
  return secret
}
