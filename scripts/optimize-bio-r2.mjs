import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'node:fs'

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_S3_ENDPOINT || 'https://24cedd8df903d1f85ab791d0b0e6d0bf.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

const BUCKET = process.env.R2_BUCKET || 'doya-assets'
const listed = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'bio/', MaxKeys: 1000 }))
const sources = (listed.Contents || [])
  .map((o) => o.Key)
  .filter((k) => k && k !== 'bio/' && !k.startsWith('bio/web/') && /\.(jpe?g|png)$/i.test(k))
  .sort()

console.log('sources', sources.length)
mkdirSync('tmp-bio-web', { recursive: true })
const manifest = []

for (const key of sources) {
  const base = key.split('/').pop().replace(/\.[^.]+$/, '')
  const outKey = `bio/web/${base}.jpg`
  const got = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = Buffer.from(await got.Body.transformToByteArray())
  const { data, info } = await sharp(bytes)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: outKey,
    Body: data,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=31536000, immutable',
  }))

  manifest.push({ key: outKey, width: info.width, height: info.height, bytes: data.length, source: key })
  console.log('ok', outKey, `${info.width}x${info.height}`, `${Math.round(data.length / 1024)}KB`)
}

writeFileSync('tmp-bio-web/manifest.json', JSON.stringify(manifest, null, 2))
console.log('DONE', manifest.length)
