# One-burger review preview

This preview is isolated at `burger-pilot.html`. The main menu continues to use its existing viewer. Do not expand the asset replacement to other menu items before the user reviews this burger.

## Ingredient contract

`assets/models/burger-pilot/manifest.json` has `version: 1`, `itemId: "midnight-stack"`, and an `ingredients` object. Supported keys are `bun-bottom`, `bun-top`, `patty`, `cheddar`, `swiss`, `lettuce`, `tomato`, `pickle`, `onion`, `bacon`, `sauce-house`, and `sauce-smoky`.

Each entry requires a relative `url` to a GLB and a positive `width`. Export GLB in its standard Y-up orientation with textures embedded. The viewer preserves the exported transforms, optionally applies a calibration `rotation` in radians, uniformly scales the larger X/Z bound to `width`, centers X/Z, and sets the model's lowest Y to zero. It does not stretch height independently.

Default order is bottom bun, selected sauce, selected lettuce, selected tomato, patty, optional extra patty, selected cheese, selected pickles, selected onion, selected bacon, top bun. Extra patty reuses the same GLB as the first patty. All 576 order configurations map to separate visible ingredient instances.

## Contact and assembly

Optional `contactBottom` and `contactTop` are distances above the normalized model's lowest point. They define support surfaces without flattening a draped cheese edge or a ruffled leaf. Their defaults are zero and the normalized model height. Optional `offset` defaults to `[0, 0, 0]` and changes visual placement only.

For each layer, beginning with `supportY = 0`:

```text
position = [offsetX, supportY - contactBottom + offsetY, offsetZ]
supportY += max(0, (stackHeight ?? (contactTop - contactBottom)) - overlap)
```

`stackHeight` is an optional explicit contact-to-contact spacing; `overlap` defaults to zero. Offline Blender renders should apply the same formula on Z after importing the standard Y-up GLBs.

## Loading and interaction

The original recipe image stays visible until every selected ingredient has loaded. It is explicitly labeled as the original recipe and never presented as reflecting changed ingredients. Rapid selections use request tokens so an earlier load cannot replace a newer recipe. Loaded templates are reused; removed ingredients are omitted from the assembled group. The preview preserves viewing angle and relative zoom on option changes.

Drag/pinch and the visible rotation, zoom, reset, and replay controls provide alternatives. Arrow keys rotate and zoom; Home resets. Reduced motion settles ingredients immediately. The preview releases GPU resources on teardown and restores itself after browser back/forward-cache navigation. Context loss returns to the labeled image fallback.

The build copies only the manifest and its referenced GLBs from the pilot asset directory. Reference images, Blender files, source textures, and temporary renders are not included in public output.

## Verification status — October 29, 2026

- All 30 automated project tests pass, including exhaustive ingredient mapping and a contact-anchor case that checks cheese removal and support height.
- Build, syntax, and whitespace checks pass.
- Browser rendering and real interaction checks remain **unverified**: local browser testing was denied by a saved permission policy. Do not retry through a different browser, hostname, or port. Offline renders of the actual GLBs can assess geometry and materials, but do not establish that browser lighting, input, reduced motion, mobile framing, or WebGL lifecycle behavior passed.
- Inspected actual exported GLBs in offline front, side, and back renders for the original recipe, no cheese, a plain burger, and a fully loaded double burger. Corrected the seed transform that inflated bun bounds, stretched surface mapping, slice normals, and excessive cheese drape. Contact values in the manifest match the rendered assembly.
- The result is a more detailed modeled-food pilot, not a verified photographic scan or a claim that it is indistinguishable from real food. Its bun silhouette, meat surface, and cheese deformation still show modeling conventions. User visual acceptance is pending; the remaining menu has not been replaced.
- All 12 GLBs are self-contained with embedded materials and no external downloads. The full ingredient library is approximately 39 MB; browser/mobile performance and further production optimization remain unverified.
