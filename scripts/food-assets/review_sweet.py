"""Reuse the canonical offline GLB renderer with isolated sweet review input/output."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source=(ROOT/'scripts/food-assets/render_menu.py').read_text()
source=source.replace("'.local-ai/menu-review.json'", "'assets/models/sweet/review/input.json'")
source=source.replace("'artifacts/menu-review'", "'assets/models/sweet/review/renders'")
exec(compile(source, str(ROOT/'scripts/food-assets/render_menu.py'), 'exec'))
