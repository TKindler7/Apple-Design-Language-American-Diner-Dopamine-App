# The Midnight Stack: one-burger preview

This pilot uses original food texture images created in chat and separate 3D ingredient meshes authored in Blender. It requires no external AI account, inference credits, or Hugging Face downloads. The image generator creates texture/reference images; Blender creates the editable geometry. Do not describe this as scanned food or AI-generated 3D geometry.

## Scope

- One burger, The Midnight Stack; other dishes remain unchanged.
- Separate bun halves, patty, cheddar, Swiss, lettuce, tomato, pickles, onion, bacon, and both sauces.
- Extra patty reuses the same independent patty asset.
- All 576 catalog configurations retain visible ingredient changes, rotation, zoom, reset, and assembly controls.
- Source artwork and authoring scripts remain separate from the optimized viewer assets.
- `burger-pilot.html` is an isolated review page. It does not replace the live site's default viewer.

## Build and preview

Run the project's normal build, serve `public/`, and open `/burger-pilot.html`. The GLB assets embed their material textures. The build publishes only model files referenced by the manifest, not original texture references or local tools.

The authoring runtime is the official Blender 4.5.15 LTS Apple Silicon build, stored locally under ignored `.local-ai/tools/Blender.app`. Its downloaded disk image matched Blender's official SHA256 checksum. No global application installation or account creation is required.

## Review requirements

Inspect the actual model from the front, sides, rear, and above; compare detail at close range. Check bun crumb, sesame seeds, meat crust, leaf folds, cheese contact, and thin sauces. Removing toppings must reveal complete surfaces, without images of ingredients that were removed. Exercise every option, maximum toppings, an extra patty, no cheese/sauce, rapid toggling, keyboard controls, and reduced motion.

Photorealism is a visual acceptance requirement, not a label earned by exporting a model. Record any remaining stylization honestly before asking the user to review the result.

## Saved review and source artwork

Actual model renders are saved in `artifacts/burger-pilot/`: original, no-cheese, plain (`simple`), and fully loaded versions, each with front/side/back views. The rotation video renders the original recipe's actual ingredient meshes.

The built-in chat image-generation tool produced the original texture images. Exact core texture prompts are in `scripts/burger-assets/core-textures.md`; topping prompts and provenance are in `assets/models/burger-pilot/toppings-provenance.json`. The original PNG artwork is retained in `assets/models/burger-pilot/textures/`. Blender bakes portable material maps and exports the geometry; it does not use external stock food or AI model weights.

Current visual assessment: substantially more detailed surfaces and complete customizable geometry, with some recognizable modeled-food qualities remaining. Review notes and unverified browser checks are recorded in `BURGER_PILOT_REVIEW.md`. No production deployment is included in this preview checkpoint.
