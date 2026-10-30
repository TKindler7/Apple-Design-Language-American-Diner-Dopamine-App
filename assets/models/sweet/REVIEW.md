# Drink and dessert asset review

The sweet family contains 23 original modular GLBs, authored in Blender and used by `food-recipes-sweet.js` for all nine drinks and desserts. These are actual meshes with embedded materials. They are not photographs shown on cards, downloaded food models, or output from a gated 3D model service.

Six original food material sources were generated with the built-in image generation tool: ice cream, brownie crust, pastry, biscuit crumb, cooked apple filling, and cheesecake. The exact prompts and saved source paths are in `texture-provenance.json`. Blender performs material color adjustments, JPEG production encoding, UV mapping, and restrained tangent-normal baking. Glass, liquid, chocolate sauce, cherry, ceramic, and iron use original material values and authored geometry.

## What changed after visual inspection

- Replaced regular stacks of apple pieces with a packed textured filling volume and naturally irregular slices at the cut faces.
- Separated the brownie crust from its body to remove visible depth-buffer stripes.
- Added fine dairy texture to the cheesecake cut surfaces.
- Added uneven folds, star-nozzle ridges, subtle dairy texture, and a flat support surface to the whipped cream.
- Replaced parallel chocolate stripes on scoops with an irregular pooled cap and unequal rounded drips, fitted to the scoop surface.
- Matched the cream-to-scoop contact for regular and large cold-brew floats in both vanilla and chocolate.
- Lifted the chocolate scoop color so its actual scoop ridges and surface texture remain visible.
- Made large glasses taller and slightly wider while preserving the proportions of cream, cherries, scoops, and ice. The size change remains visible when the view is fitted to the object.

## Evidence

The review uses the actual exported GLBs, imported back into Blender, with the same manifest widths, centered horizontal bounds, bottom alignment, transforms, and explicit ingredient placements as the website.

- `review/default-contact.jpg`: all nine original recipes.
- `review/minimal-contact.jpg`: all nine recipes with removable extras omitted; soda has no ice.
- `review/loaded-contact.jpg`: all nine with every extra selected; drinks use large servings and the float uses chocolate ice cream.
- `review/float-contact-check.jpg`: cream contact on vanilla/chocolate scoops at regular/large sizes.
- `review/renders/`: the 31 individual review images.
- `dimensions.json`: actual exported geometry bounds, triangle counts, and file sizes.
- `packaging-validation.json`: GLB structure and embedded-image validation; no external asset references.

The materials and contacts have been visually inspected in these offline renders. Browser WebGL rendering, touch performance, and live control behavior remain unverified because local browser testing was denied by a saved policy. Offline Blender lighting and refraction can differ from the website; these renders do not establish live-browser parity. The output is original textured 3D artwork, not a scan of physical food, and fine close-up food detail still has that practical limit.

## Rebuild

From the project root:

```sh
.local-ai/tools/Blender.app/Contents/MacOS/Blender --background --python scripts/food-assets/sweet.py
node scripts/food-assets/prepare-sweet-review.mjs
.local-ai/tools/Blender.app/Contents/MacOS/Blender --background --python scripts/food-assets/review_sweet.py -- --variant default --size 600 --samples 24
```

Repeat the review command with `minimal`, `loaded`, `vanilla-regular`, `vanilla-large`, `chocolate-regular`, or `chocolate-large`. `--cpu` uses the canonical renderer's CPU fallback if the Metal driver cannot render. The sweet review input/output is separate from the main menu's review run.

The shared `sweet-whipped-cream` asset has width **0.886224** and normalized height **0.655540**. All exported object transforms are applied; standard glTF Y-up orientation is retained. Raw sources and review images are authoring records, not required website downloads.
