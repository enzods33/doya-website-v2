import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'

function required(name: string): string {
  const value = Deno.env.get(name) ?? ''
  if (!value) throw new Error(`missing_${name}`)
  return value
}

export function r2PublicBase(): string {
  return (Deno.env.get('R2_PUBLIC_BASE') ?? 'https://pub-5b2b2b3b50ba46c485eeff926fa26420.r2.dev').replace(/\/$/, '')
}

export function r2Client() {
  return new AwsClient({
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    service: 's3',
    region: 'auto',
  })
}

export function r2Bucket(): string {
  return Deno.env.get('R2_BUCKET') ?? 'doya-assets'
}

/** Endpoint S3 R2 sans slash final ni nom de bucket collé par erreur. */
export function r2Endpoint(): string {
  let endpoint = required('R2_S3_ENDPOINT').replace(/\/$/, '')
  const bucket = r2Bucket()
  if (endpoint.endsWith(`/${bucket}`)) {
    endpoint = endpoint.slice(0, -(bucket.length + 1))
  }
  return endpoint
}

export async function r2PutObject(key: string, body: Uint8Array, contentType: string) {
  const client = r2Client()
  const url = `${r2Endpoint()}/${r2Bucket()}/${key}`
  // Blob + content-length : aws4fetch signe correctement le body en Deno Edge.
  const blob = new Blob([body], { type: contentType })
  const response = await client.fetch(url, {
    method: 'PUT',
    headers: {
      'content-type': contentType,
      'content-length': String(body.byteLength),
      'cache-control': 'public, max-age=31536000, immutable',
    },
    body: blob,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`r2_put_failed:${response.status}:${text.slice(0, 180)}`)
  }
  return `${r2PublicBase()}/${key}`
}

export async function r2DeleteObject(key: string) {
  // Ne pas tenter de supprimer les imports « site » hors clés uploadées bio/web/timestamp-
  if (!key || key.includes('..')) return
  const client = r2Client()
  const url = `${r2Endpoint()}/${r2Bucket()}/${key}`
  const response = await client.fetch(url, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    const text = await response.text()
    throw new Error(`r2_delete_failed:${response.status}:${text.slice(0, 180)}`)
  }
}
