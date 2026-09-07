/**
 * Compresse et upload hero / album / shop vers Cloudflare R2.
 * Lit les secrets dans supabase/functions/.env.local (et .env.local).
 *
 * Usage: node scripts/upload-site-assets-r2.mjs
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    let value = line.slice(i + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(join(root, 'supabase/functions/.env.local'))
loadEnvFile(join(root, '.env.local'))

const endpoint = process.env.R2_S3_ENDPOINT
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucket = process.env.R2_BUCKET || 'doya-assets'
const publicBase = (process.env.R2_PUBLIC_BASE || 'https://pub-5b2b2b3b50ba46c485eeff926fa26420.r2.dev').replace(/\/$/, '')

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2_S3_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
})

const jobs = [
  {
    local: 'src/assets/images/doya/doya-desert-chairs-front.jpg',
    key: 'site/hero.jpg',
    kind: 'photo',
    max: 1600,
  },
  {
    local: 'src/assets/images/luna-bohemia/luna-bohemia-cover.jpg',
    key: 'site/cover.jpg',
    kind: 'photo',
    max: 1200,
  },
  {
    local: 'src/assets/images/doya/doya-desert-02.jpg',
    key: 'site/editorial.jpg',
    kind: 'photo',
    max: 1400,
  },
]

const shopDir = join(root, 'src/assets/images/shop')
// Sources locales optionnelles : le site lit déjà R2 (`shop/web/…`).
// Re-déposer des JPG/PNG ici uniquement pour re-uploader / re-compresser.
if (existsSync(shopDir)) {
  for (const name of readdirSync(shopDir)) {
    if (!/\.(jpe?g|png)$/i.test(name)) continue
    if (name.startsWith('.')) continue
    const lower = name.toLowerCase()
    if (lower.includes('extracted')) continue
    const base = basename(name, extname(name))
    const isCd = lower.includes('cd-')
    const isPng = /\.png$/i.test(name)
    jobs.push({
      local: `src/assets/images/shop/${name}`,
      key: isPng ? `shop/web/${base}.webp` : `shop/web/${base}.jpg`,
      kind: isPng ? 'product' : 'photo',
      max: isCd ? 1200 : 1400,
    })
  }
}

const manifest = []

async function uploadOne(job) {
  const abs = join(root, job.local)
  if (!existsSync(abs)) {
    console.warn('skip missing', job.local)
    return
  }
  const input = readFileSync(abs)
  let pipeline = sharp(input).rotate()
  if (job.kind === 'product') {
    pipeline = pipeline
      .resize({ width: job.max, height: job.max, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, alphaQuality: 90 })
  } else {
    pipeline = pipeline
      .resize({ width: job.max, height: job.max, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
  }
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })
  const contentType = job.kind === 'product' ? 'image/webp' : 'image/jpeg'
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: job.key,
    Body: data,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  const row = {
    local: job.local,
    key: job.key,
    url: `${publicBase}/${job.key}`,
    width: info.width,
    height: info.height,
    bytes: data.length,
  }
  manifest.push(row)
  console.log('ok', job.key, `${info.width}x${info.height}`, `${Math.round(data.length / 1024)}KB`)
}

for (const job of jobs) {
  await uploadOne(job)
}

writeFileSync(join(root, 'tmp-r2-site-manifest.json'), JSON.stringify(manifest, null, 2))
console.log('DONE', manifest.length, '→', publicBase)
