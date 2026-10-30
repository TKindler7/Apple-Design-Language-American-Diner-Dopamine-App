# Original savory ingredient assets

These twenty assets were authored for this diner in Blender 4.5.15. The food texture atlases were generated through the built-in chat image generator; there are no downloaded food models, product photographs, Hugging Face dependencies, or paid generation APIs.

The two retained original source atlases are in `sources/`. Their creative briefs were:

- **Griddle atlas:** Four evenly sized, edge-to-edge photographic material quadrants: naturally browned porous pancake, toasted sourdough crumb, irregular crisp fried chicken breading, and roasted potato surface. Neutral diffuse lighting and fine food detail, without labels, plates, typography, or dramatic baked-in shadows.
- **Vegetable atlas:** Four evenly sized photographic material quadrants: caramelized onion, cooked cremini mushroom, roasted zucchini flesh, and avocado flesh. Neutral diffuse lighting, naturally uneven coloration and organic texture, without labels or decorative objects.

The original burger pilot's generated brioche, crumb, and beef material sources are reused for bread crust, crumb, and sausage. All atlas projection is baked to UV maps on authored closed meshes; ingredient meshes are genuine three-dimensional surfaces, not image planes. The source atlases and the full authoring script remain editable.

Small smooth ingredients such as butter, blueberries, eggs, and chocolate chips use modeled forms and original material colors. Egg white has subtle baked surface variation and modeled cooked blisters. Syrup uses a thin, irregular translucent mesh so the bread texture remains visible through it. The ceramic plate is a separate reusable object.

Every exported ingredient is centered horizontally, aligned to its physical bottom, and exported with applied transforms in glTF's Y-up convention. Dimensions and triangle/byte counts are recorded in `manifest.json` and `provenance.json`. Separate recipe placements preserve all supported ingredient and portion options.

These are original food-inspired 3D assets with photographic textures. Studio renders are a visual review aid; they are not a claim that every material is indistinguishable from a food photograph under every viewing condition.
