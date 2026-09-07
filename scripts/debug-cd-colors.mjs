import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pdfPath = 'c:/Users/steph/Downloads/DigiPack_CD_Doya.pdf'
const outDir = path.join(__dirname, '../src/assets/images/shop/extracted-cd')
fs.mkdirSync(outDir, { recursive: true })

const buf = fs.readFileSync(pdfPath)
const text = buf.toString('latin1')
const re = /<<([\s\S]*?)>>\s*stream\r?\n/g
let match
let count = 0

while ((match = re.exec(text)) !== null) {
  const dict = match[1]
  if (!/\/Subtype\s*\/Image/.test(dict)) continue
  if (/\/ImageMask\s+true/.test(dict)) continue

  const width = Number((dict.match(/\/Width\s+(\d+)/) || [])[1])
  const height = Number((dict.match(/\/Height\s+(\d+)/) || [])[1])
  if (!width || !height || width < 800) continue

  const filter = (dict.match(/\/Filter\s*\/(\w+)/) || dict.match(/\/Filter\s*\[\s*\/(\w+)/) || [])[1]
  const cs = dict.includes('DeviceCMYK') || /\/CMYK/.test(dict)
    ? 'cmyk'
    : dict.includes('DeviceGray')
      ? 'gray'
      : dict.includes('ICCBased')
        ? 'icc'
        : 'rgb'

  const absStart = match.index + match[0].length
  const endRel = buf.slice(absStart).toString('latin1').indexOf('endstream')
  if (endRel < 0) continue
  let raw = buf.slice(absStart, absStart + endRel)
  while (raw.length && (raw[raw.length - 1] === 10 || raw[raw.length - 1] === 13)) {
    raw = raw.subarray(0, raw.length - 1)
  }

  let data
  try {
    data = filter === 'FlateDecode' ? zlib.inflateSync(raw) : raw
  } catch {
    continue
  }

  count += 1
  const meta = {
    count,
    width,
    height,
    filter,
    cs,
    inflated: data.length,
    perPx: data.length / (width * height),
    hasSMask: /\/SMask\s/.test(dict),
    dictHead: dict.replace(/\s+/g, ' ').slice(0, 180),
  }
  console.log(JSON.stringify(meta))

  const base = `dbg-${String(count).padStart(2, '0')}-${width}x${height}-${cs}`
  try {
    if (filter === 'DCTDecode') {
      fs.writeFileSync(path.join(outDir, `${base}.jpg`), raw)
      continue
    }
    const bpp = data.length / (width * height)
    if (Math.abs(bpp - 4) < 0.01 || cs === 'cmyk') {
      // Try CMYK
      await sharp(Buffer.from(data.subarray(0, width * height * 4)), {
        raw: { width, height, channels: 4 },
      })
        .toColourspace('srgb')
        .png()
        .toFile(path.join(outDir, `${base}-as-cmyk.png`))
      // Also try as RGBA
      await sharp(Buffer.from(data.subarray(0, width * height * 4)), {
        raw: { width, height, channels: 4 },
      })
        .ensureAlpha()
        .png()
        .toFile(path.join(outDir, `${base}-as-rgba.png`))
    } else if (Math.abs(bpp - 3) < 0.01) {
      await sharp(Buffer.from(data.subarray(0, width * height * 3)), {
        raw: { width, height, channels: 3 },
      })
        .png()
        .toFile(path.join(outDir, `${base}-as-rgb.png`))
    }
  } catch (error) {
    console.log('fail', base, error.message)
  }
}
