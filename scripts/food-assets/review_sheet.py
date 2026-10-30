"""Arrange actual-model review renders, without changing their pixels or food."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--variant', default='default')
args = parser.parse_args()
files = sorted((root / 'artifacts/menu-review').glob(f'*-{args.variant}.png'))
cols, tile, label, margin = 4, 360, 50, 18
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tile + margin) + margin, rows * (tile + label + margin) + margin), '#f6f4f0')
draw = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 19)
except OSError:
    font = ImageFont.load_default()
for index, path in enumerate(files):
    x = margin + index % cols * (tile + margin)
    y = margin + index // cols * (tile + label + margin)
    image = Image.open(path).convert('RGB')
    image.thumbnail((tile, tile))
    sheet.paste(image, (x + (tile - image.width) // 2, y + (tile - image.height) // 2))
    title = path.stem.removesuffix('-' + args.variant).replace('-', ' ').title()
    draw.text((x + tile / 2, y + tile + 15), title, fill='#242424', font=font, anchor='mt')
out = root / 'artifacts/menu-review' / f'{args.variant}-contact-sheet.jpg'
sheet.save(out, quality=91)
print(out)
