"""Delivery encoding for self-contained GLBs. Original texture sources stay untouched.

Color maps: at most 1024px JPEG quality 88; normal/data maps: 1024px lossless PNG.
Geometry, materials, UVs, and all image proportions remain unchanged.
Run with the bundled Python (Pillow), passing one or more GLB paths.
"""
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image


def optimize(path):
    data = path.read_bytes()
    json_length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + json_length])
    binary = data[28 + json_length:]
    data_images = set()
    for material in doc.get('materials', []):
        for info in [material.get('normalTexture'), material.get('occlusionTexture'), material.get('pbrMetallicRoughness', {}).get('metallicRoughnessTexture')]:
            if info:
                data_images.add(doc['textures'][info['index']]['source'])
    replacements = {}
    for index, image in enumerate(doc.get('images', [])):
        view_index = image.get('bufferView')
        if view_index is None:
            raise ValueError('Only embedded textures are supported')
        view = doc['bufferViews'][view_index]
        start = view.get('byteOffset', 0)
        raw = binary[start:start + view['byteLength']]
        source = Image.open(io.BytesIO(raw))
        if max(source.size) <= 1024 and image.get('mimeType') == 'image/jpeg':
            continue
        source.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        if index in data_images or ('A' in source.getbands() and source.getextrema()[-1][0] < 255):
            source.save(encoded, format='PNG', optimize=True)
            image['mimeType'] = 'image/png'
        else:
            source.convert('RGB').save(encoded, format='JPEG', quality=88, optimize=True)
            image['mimeType'] = 'image/jpeg'
        replacements[view_index] = encoded.getvalue()
    pieces = bytearray()
    for index, view in enumerate(doc['bufferViews']):
        start = view.get('byteOffset', 0)
        raw = replacements.get(index, binary[start:start + view['byteLength']])
        pieces.extend(b'\x00' * (-len(pieces) % 4))
        view['byteOffset'] = len(pieces)
        view['byteLength'] = len(raw)
        pieces.extend(raw)
    doc['buffers'][0]['byteLength'] = len(pieces)
    pieces.extend(b'\x00' * (-len(pieces) % 4))
    encoded = json.dumps(doc, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    result = struct.pack('<III', 0x46546c67, 2, 28 + len(encoded) + len(pieces))
    result += struct.pack('<II', len(encoded), 0x4e4f534a) + encoded
    result += struct.pack('<II', len(pieces), 0x004e4942) + pieces
    path.write_bytes(result)
    print(f'{path.name}: {len(data) / 1e6:.2f} → {len(result) / 1e6:.2f} MB')


for filename in sys.argv[1:]:
    optimize(Path(filename))
