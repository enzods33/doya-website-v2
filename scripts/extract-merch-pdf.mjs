import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from 'canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pdfPath = 'c:/Users/steph/Downloads/MOCK UP - DOYA MERCH P224.pdf'
const outDir = path.join(__dirname, '../src/assets/images/shop')
const extractDir = path.join(outDir, 'extracted')
fs.mkdirSync(extractDir, { recursive: true })

const data = new Uint8Array(fs.readFileSync(pdfPath))
const doc = await pdfjs.getDocument({ data, disableWorker: true, verbosity: 0 }).promise
const scale = 2.2

for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  const preview = path.join(extractDir, `page${p}-full.png`)
  fs.writeFileSync(preview, canvas.toBuffer('image/png'))
  console.log('page', p, canvas.width, canvas.height, '->', path.basename(preview))
}

// Page layout (A4 portrait ~842x1191 @1x): two product rows.
// Each row: front | back | stock text
// Approximate crop boxes as fractions of page size (tuned after preview).
const crops = {
  1: [
    { id: 'luna-bohemia-white-front', y0: 0.14, y1: 0.48, x0: 0.06, x1: 0.36 },
    { id: 'luna-bohemia-white-back', y0: 0.14, y1: 0.48, x0: 0.36, x1: 0.66 },
    { id: 'luna-bohemia-black-front', y0: 0.52, y1: 0.86, x0: 0.06, x1: 0.36 },
    { id: 'luna-bohemia-black-back', y0: 0.52, y1: 0.86, x0: 0.36, x1: 0.66 },
  ],
  2: [
    { id: 'doya-white-front', y0: 0.14, y1: 0.48, x0: 0.06, x1: 0.36 },
    { id: 'doya-white-back', y0: 0.14, y1: 0.48, x0: 0.36, x1: 0.66 },
    { id: 'doya-black-front', y0: 0.52, y1: 0.86, x0: 0.06, x1: 0.36 },
    { id: 'doya-black-back', y0: 0.52, y1: 0.86, x0: 0.36, x1: 0.66 },
  ],
}

for (const [page, items] of Object.entries(crops)) {
  const full = path.join(extractDir, `page${page}-full.png`)
  const meta = await sharp(full).metadata()
  for (const item of items) {
    const left = Math.round(meta.width * item.x0)
    const top = Math.round(meta.height * item.y0)
    const width = Math.round(meta.width * (item.x1 - item.x0))
    const height = Math.round(meta.height * (item.y1 - item.y0))
    const dest = path.join(outDir, `${item.id}.png`)
    await sharp(full)
      .extract({ left, top, width, height })
      .resize(1400, 1400, { fit: 'contain', background: '#ffffff' })
      .png()
      .toFile(dest)
    console.log('crop', item.id, { left, top, width, height })
  }
}
