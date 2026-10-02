/** Un lien chiffré permet de retirer uniquement l'adresse qui a reçu la newsletter.
 * Les anciens tokens HMAC restent acceptés pour ne pas casser les campagnes déjà envoyées.
 */
function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): ArrayBuffer {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4))
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`doya-newsletter-encryption:${secret}`))
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function legacySignedToken(email: string, secret: string): Promise<string> {
  const payload = base64Url(new TextEncoder().encode(email.trim().toLowerCase()))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(`doya-newsletter:${payload}`))
  return `${payload}.${base64Url(new Uint8Array(signature))}`
}

export async function signNewsletterAddress(email: string, secret: string): Promise<string> {
  const normalized = email.trim().toLowerCase()
  if (!secret || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('invalid_unsubscribe_payload')

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await encryptionKey(secret),
    new TextEncoder().encode(normalized),
  )
  return `v2.${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`
}

async function verifyLegacyToken(token: string, secret: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{6,400}\.[A-Za-z0-9_-]{43}$/.test(token)) return null
  try {
    const [payload, signature] = token.split('.')
    const valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(secret),
      fromBase64Url(signature),
      new TextEncoder().encode(`doya-newsletter:${payload}`),
    )
    if (!valid) return null
    const email = new TextDecoder().decode(fromBase64Url(payload))
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
  } catch {
    return null
  }
}

export async function verifyNewsletterAddress(token: string, secret: string): Promise<string | null> {
  if (!secret || !token) return null

  if (token.startsWith('v2.')) {
    const parts = token.split('.')
    if (parts.length !== 3 || !/^[A-Za-z0-9_-]{16}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{20,500}$/.test(parts[2])) {
      return null
    }
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(fromBase64Url(parts[1])) },
        await encryptionKey(secret),
        fromBase64Url(parts[2]),
      )
      const email = new TextDecoder().decode(decrypted)
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
    } catch {
      return null
    }
  }

  return verifyLegacyToken(token, secret)
}

// Export de test uniquement pour vérifier la rétrocompatibilité sans exposer
// le détail dans les fonctions publiques.
export async function legacyNewsletterTokenForTest(email: string, secret: string) {
  return legacySignedToken(email, secret)
}
