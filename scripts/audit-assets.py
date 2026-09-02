"""Read-only PDF audit; writes only review thumbnails and a provenance manifest."""
from pathlib import Path
import hashlib
import json
import subprocess
from pypdf import PdfReader
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
(ROOT / 'tmp/pdfs').mkdir(parents=True, exist_ok=True)
pdf_path = ROOT / 'reference/direction-artistique-luna-bohemia.pdf'
doc = PdfReader(pdf_path)
native = {}

def image_objects(resources):
    for reference in resources.get('/XObject', {}).get_object().values() if resources.get('/XObject') else []:
        obj = reference.get_object()
        if obj.get('/Subtype') == '/Image':
            yield obj
        elif obj.get('/Subtype') == '/Form' and obj.get('/Resources'):
            yield from image_objects(obj['/Resources'])

for page_number, page in enumerate(doc.pages, 1):
    for obj in image_objects(page['/Resources']):
        if '/DCTDecode' not in str(obj.get('/Filter', '')):
            continue
        digest = hashlib.sha256(obj.get_data()).hexdigest()
        record = native.setdefault(digest, {'pages': [], 'width': obj['/Width'], 'height': obj['/Height']})
        if page_number not in record['pages']:
            record['pages'].append(page_number)

manifest = []
for path in sorted((ROOT / 'src/assets').rglob('*')):
    if path.suffix.lower() not in {'.jpg', '.png'}:
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    with Image.open(path) as im:
        manifest.append({
            'file': str(path.relative_to(ROOT)).replace('\\', '/'),
            'width': im.width, 'height': im.height, 'mode': im.mode,
            'bytes': path.stat().st_size, 'sha256': digest,
            'nativeJpegVerified': digest in native,
            'pages': native.get(digest, {}).get('pages', []),
        })
(ROOT / 'reference/asset-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

sheet = Image.new('RGB', (1200, 8 * 350), '#dddddd')
draw = ImageDraw.Draw(sheet)
subprocess.run(['pdftoppm', '-scale-to', '315', '-png', str(pdf_path), str(ROOT / 'tmp/pdfs/page')], check=True)
for idx, page_path in enumerate(sorted((ROOT / 'tmp/pdfs').glob('page-*.png'))):
    im = Image.open(page_path).convert('RGB')
    im.thumbnail((280, 315))
    x, y = (idx % 4) * 300, (idx // 4) * 350
    sheet.paste(im, (x, y + 25))
    draw.text((x + 8, y + 5), f'PDF / {idx + 1:02}', fill='black')
sheet.save(ROOT / 'tmp/pdfs/overview.png')

photo_paths = sorted((ROOT / 'src/assets/images/doya').glob('*.jpg'))
photo_sheet = Image.new('RGB', (1200, 6 * 290), '#f4f1ec')
draw = ImageDraw.Draw(photo_sheet)
for idx, path in enumerate(photo_paths):
    with Image.open(path) as im:
        im = im.convert('RGB')
        im.thumbnail((280, 250))
        x, y = (idx % 4) * 300, (idx // 4) * 290
        photo_sheet.paste(im, (x, y + 26))
        draw.text((x + 5, y + 5), path.stem, fill='black')
photo_sheet.save(ROOT / 'tmp/pdfs/photos-overview.png')
print(json.dumps({'pages': len(doc.pages), 'rasterAssets': len(manifest), 'nativeJpegsVerified': sum(item['nativeJpegVerified'] for item in manifest)}))
