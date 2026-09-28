/** Un lien signé permet de retirer uniquement l'adresse qui a reçu la newsletter. */
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

export async function signNewsletterAddress(email: string, secret: string): Promise<string> {
  const payload = base64Url(new TextEncoder().encode(email.trim().toLowerCase()))
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(`doya-newsletter:${payload}`))
  return `${payload}.${base64Url(new Uint8Array(signature))}`
}

export async function verifyNewsletterAddress(token: string, secret: string): Promise<string | null> {
  if (!secret || !/^[A-Za-z0-9_-]{6,400}\.[A-Za-z0-9_-]{43}$/.test(token)) return null
  try {
    const [payload, signature] = token.split('.')
    const valid = await crypto.subtle.verify('HMAC', await signingKey(secret), fromBase64Url(signature), new TextEncoder().encode(`doya-newsletter:${payload}`))
    if (!valid) return null
    const email = new TextDecoder().decode(fromBase64Url(payload))
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
  } catch {
    return null
  }
}
