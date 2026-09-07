/**
 * Extract DigiPack CD face/back from Illustrator CMYK PDF.
 * Images are DeviceCMYK / ICCBased(4) — must NOT be read as RGBA.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pdfPath = 'c:/Users/steph/Downloads/DigiPack_CD_Doya.pdf'
const shopDir = path.join(__dirname, '../src/assets/images/shop')
const outDir = path.join(shopDir, 'extracted-cd')
fs.mkdirSync(outDir, { recursive: true })

const buf = fs.readFileSync(pdfPath)
const text = buf.toString('latin1')

/** @type {Map<number, { offset: number }>} */
const xref = new Map()
{
  const xrefPos = text.lastIndexOf('startxref')
  const start = Number(text.slice(xrefPos).match(/startxref\s+(\d+)/)?.[1])
  if (Number.isFinite(start)) {
    const table = text.slice(start)
    const lines = table.split(/\r?\n/)
    let objNum = 0
    for (const line of lines) {
      const head = line.match(/^(\d+)\s+(\d+)/)
      if (head && !line.includes('f') && !line.includes('n') && lines[lines.indexOf(line) + 1]?.match(/^\d{10}/)) {
        objNum = Number(head[1])
        continue
      }
      const ent = line.match(/^(\d{10})\s+(\d{5})\s+([nf])/)
      if (ent) {
        if (ent[3] === 'n') xref.set(objNum, { offset: Number(ent[1]) })
        objNum += 1
      }
      if (line.startsWith('trailer')) break
    }
  }
}

function readObj(num) {
  let offset = xref.get(num)?.offset
  if (offset == null) {
    const m = text.match(new RegExp(`(?:^|\\D)${num} 0 obj`))
    if (!m) return null
    offset = m.index + (m[0].startsWith(String(num)) ? 0 : 1)
  }
  const slice = text.slice(offset)
  const streamMatch = slice.match(/^\d+ 0 obj\s*<<([\s\S]*?)>>\s*stream\r?\n/)
  if (streamMatch) {
    const dict = streamMatch[1]
    const absStart = offset + streamMatch[0].length
    const endRel = buf.slice(absStart).toString('latin1').indexOf('endstream')
    let raw = buf.slice(absStart, absStart + endRel)
    while (raw.length && (raw[raw.length - 1] === 10 || raw[raw.length - 1] === 13)) {
      raw = raw.subarray(0, raw.length - 1)
    }
    return { dict, raw }
  }
  const plain = slice.match(/^\d+ 0 obj\s*([\s\S]*?)endobj/)
  return plain ? { dict: plain[1], raw: null } : null
}

function resolveColorSpace(dict) {
  const named = dict.match(/\/ColorSpace\s*\/(DeviceCMYK|DeviceRGB|DeviceGray|ICCBased)/)
  if (named) return named[1]
  const ref = dict.match(/\/ColorSpace\s+(\d+)\s+0\s+R/)
  if (!ref) return 'unknown'
  const obj = readObj(Number(ref[1]))
  if (!obj) return `ref:${ref[1]}`
  const body = obj.dict || ''
  if (/DeviceCMYK/.test(body) || /\/N\s+4/.test(body)) return 'DeviceCMYK'
  if (/DeviceRGB/.test(body) || /\/N\s+3/.test(body)) return 'DeviceRGB'
  if (/DeviceGray/.test(body) || /\/N\s+1/.test(body)) return 'DeviceGray'
  // Illustrator often uses ICCBased with /Alternate /DeviceCMYK
  if (/ICCBased/.test(body) && /DeviceCMYK/.test(body)) return 'DeviceCMYK'
  if (/Colors\s+4/.test(dict) || /\/DecodeParms<<[^>]*Colors\s+4/.test(dict)) return 'DeviceCMYK'
  return body.replace(/\s+/g, ' ').slice(0, 120)
}

function inflatePredictor(data, width, height, colors, bits = 8) {
  // PNG predictor (PDF Predictor 10-15): each row starts with a filter byte
  const bpp = (colors * bits) / 8
  const rowIn = 1 + width * bpp
  if (data.length === height * rowIn) {
    const out = Buffer.alloc(width * height * bpp)
    let prev = Buffer.alloc(width * bpp)
    for (let y = 0; y < height; y++) {
      const f = data[y * rowIn]
      const row = data.subarray(y * rowIn + 1, (y + 1) * rowIn)
      const cur = Buffer.alloc(width * bpp)
      for (let i = 0; i < row.length; i++) {
        const left = i >= bpp ? cur[i - bpp] : 0
        const up = prev[i]
        const upLeft = i >= bpp ? prev[i - bpp] : 0
        let val = row[i]
        if (f === 1) val = (val + left) & 255
        else if (f === 2) val = (val + up) & 255
        else if (f === 3) val = (val + Math.floor((left + up) / 2)) & 255
        else if (f === 4) {
          const p = left + up - upLeft
          const pa = Math.abs(p - left)
          const pb = Math.abs(p - up)
          const pc = Math.abs(p - upLeft)
          const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft
          val = (val + pr) & 255
        }
        cur[i] = val
      }
      cur.copy(out, y * width * bpp)
      prev = cur
    }
    return out
  }
  return data
}

function cmykToRgba(cmyk, width, height, alpha) {
  const n = width * height
  const rgba = Buffer.alloc(n * 4)
  for (let i = 0; i < n; i++) {
    const C = cmyk[i * 4] / 255
    const M = cmyk[i * 4 + 1] / 255
    const Y = cmyk[i * 4 + 2] / 255
    const K = cmyk[i * 4 + 3] / 255
    rgba[i * 4] = Math.round(255 * (1 - C) * (1 - K))
    rgba[i * 4 + 1] = Math.round(255 * (1 - M) * (1 - K))
    rgba[i * 4 + 2] = Math.round(255 * (1 - Y) * (1 - K))
    rgba[i * 4 + 3] = alpha ? alpha[i] : 255
  }
  return rgba
}

function extractFlateImage(dict, raw) {
  const width = Number(dict.match(/\/Width\s+(\d+)/)?.[1])
  const height = Number(dict.match(/\/Height\s+(\d+)/)?.[1])
  const bits = Number(dict.match(/\/BitsPerComponent\s+(\d+)/)?.[1] || 8)
  let data = zlib.inflateSync(raw)

  const dp = dict.match(/\/DecodeParms\s*<<([^>]*)>>/)
  let colors = Number(dp?.[1].match(/\/Colors\s+(\d+)/)?.[1])
  const cs = resolveColorSpace(dict)
  if (!colors) {
    if (cs === 'DeviceCMYK') colors = 4
    else if (cs === 'DeviceRGB') colors = 3
    else if (cs === 'DeviceGray') colors = 1
    else if (data.length >= width * height * 4) colors = 4
    else if (data.length >= width * height * 3) colors = 3
    else colors = 1
  }

  data = inflatePredictor(data, width, height, colors, bits)

  let alpha = null
  const smRef = dict.match(/\/SMask\s+(\d+)\s+0\s+R/)
  if (smRef) {
    const sm = readObj(Number(smRef[1]))
    if (sm?.raw) {
      let smData = zlib.inflateSync(sm.raw)
      const smW = Number(sm.dict.match(/\/Width\s+(\d+)/)?.[1] || width)
      const smH = Number(sm.dict.match(/\/Height\s+(\d+)/)?.[1] || height)
      smData = inflatePredictor(smData, smW, smH, 1, 8)
      alpha = smData.subarray(0, smW * smH)
    }
  }

  return { width, height, colors, cs, data, alpha }
}

// Collect image XObjects (skip false positives from binary noise)
const re = /<<([\s\S]*?)>>\s*stream\r?\n/g
let match
const images = []
while ((match = re.exec(text)) !== null) {
  const dict = match[1]
  if (!/\/Subtype\s*\/Image/.test(dict)) continue
  if (/\/ImageMask\s+true/.test(dict)) continue
  if (!/\/Filter\s*\/FlateDecode/.test(dict) && !/\/Filter\s*\[\s*\/FlateDecode/.test(dict)) continue

  const width = Number(dict.match(/\/Width\s+(\d+)/)?.[1])
  const height = Number(dict.match(/\/Height\s+(\d+)/)?.[1])
  if (!width || !height || width < 800 || height < 800) continue

  const absStart = match.index + match[0].length
  const endRel = buf.slice(absStart).toString('latin1').indexOf('endstream')
  if (endRel < 0) continue
  let raw = buf.slice(absStart, absStart + endRel)
  while (raw.length && (raw[raw.length - 1] === 10 || raw[raw.length - 1] === 13)) {
    raw = raw.subarray(0, raw.length - 1)
  }

  try {
    const img = extractFlateImage(dict, raw)
    images.push(img)
    console.log({
      width: img.width,
      height: img.height,
      colors: img.colors,
      cs: img.cs,
      inflated: img.data.length,
      hasAlpha: Boolean(img.alpha),
    })
  } catch (e) {
    console.warn('skip', width, height, e.message)
  }
}

async function writeRgb(img, file) {
  let rgba
  if (img.colors === 4 || img.cs === 'DeviceCMYK') {
    rgba = cmykToRgba(img.data, img.width, img.height, img.alpha)
  } else if (img.colors === 3) {
    rgba = Buffer.alloc(img.width * img.height * 4)
    for (let i = 0, p = 0; i < img.width * img.height; i++, p += 3) {
      rgba[i * 4] = img.data[p]
      rgba[i * 4 + 1] = img.data[p + 1]
      rgba[i * 4 + 2] = img.data[p + 2]
      rgba[i * 4 + 3] = img.alpha ? img.alpha[i] : 255
    }
  } else {
    throw new Error(`unsupported channels ${img.colors}`)
  }

  await sharp(rgba, { raw: { width: img.width, height: img.height, channels: 4 } })
    .png()
    .toFile(file)
  console.log('wrote', path.basename(file))
}

// Face = square ~4128, back = taller panel ~3923x5884
const face = images.find((i) => Math.abs(i.width - i.height) < 50 && i.width > 3000)
const back = images.find((i) => i.height > i.width * 1.2 && i.width > 3000)

if (!face || !back) {
  console.error('face/back not found', { face: !!face, back: !!back, n: images.length })
  process.exit(1)
}

await writeRgb(face, path.join(outDir, 'face-cmyk.png'))
await writeRgb(back, path.join(outDir, 'back-cmyk.png'))
await writeRgb(face, path.join(shopDir, 'cd-luna-bohemia-front.png'))
await writeRgb(back, path.join(shopDir, 'cd-luna-bohemia-back.png'))

// Sample center pixel for sanity
function sample(img, x, y) {
  const i = (y * img.width + x) * 4
  const C = img.data[i] / 255
  const M = img.data[i + 1] / 255
  const Y = img.data[i + 2] / 255
  const K = img.data[i + 3] / 255
  return {
    cmyk: [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]],
    rgb: [
      Math.round(255 * (1 - C) * (1 - K)),
      Math.round(255 * (1 - M) * (1 - K)),
      Math.round(255 * (1 - Y) * (1 - K)),
    ],
  }
}
console.log('face center', sample(face, Math.floor(face.width / 2), Math.floor(face.height / 2)))
console.log('done')
