"""Reuse the canonical offline GLB renderer with isolated sides review input/output."""
from pathlib import Path
import sys
if '--' not in sys.argv:
    sys.argv.append('--')
if '--cpu' not in sys.argv:
    sys.argv.append('--cpu')
ROOT=Path(__file__).resolve().parents[2]
source=(ROOT/'scripts/food-assets/render_menu.py').read_text()
source=source.replace("'.local-ai/menu-review.json'", "'assets/models/sides/review/input.json'")
source=source.replace("'artifacts/menu-review'", "'assets/models/sides/review/renders'")
source=source.replace("dish['variant'] == args.variant", "(args.variant == 'all' or dish['variant'] == args.variant)")
exec(compile(source, str(ROOT/'scripts/food-assets/render_menu.py'), 'exec'))
