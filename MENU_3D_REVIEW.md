# Full-menu textured 3D review

The user approved extending the one-burger direction to every dish on October 29, 2026. The main app now uses original, independently authored GLB ingredients across all 23 menu items. These are textured computer-generated models, not scans or photographs.

## What is integrated

- Three burgers reuse the reviewed bun, beef, cheese, vegetable, bacon, and sauce assets.
- Three sandwiches and four breakfasts use separately authored bread, chicken, vegetables, pancakes, eggs, proteins, potatoes, and toppings.
- Four sides use portion-specific fry piles, fitted chili/cheese, breaded pickles and dips, and hollow macaroni with removable garnishes.
- Five drinks and four desserts use separate glassware, liquids, ice, scoop flavors, cream, sauces, fruit, pastry, cake, and brownie assets.
- The customization dialog and fictional kitchen both use the new viewer. Existing menu photographs remain the explicitly labeled original-recipe fallback.

## Source and delivery

Original material images were generated through the built-in chat image tool. Original geometry, UVs, surface details, and baked material maps were authored in Blender. Family source scripts and provenance live under `scripts/food-assets/` and `assets/models/{savory,sides,sweet}/`. The burger source remains under `scripts/burger-assets/`.

No Hugging Face dependency, gated weights, copied models, paid external 3D service, account credentials, or user uploads are used by this workflow. Local authoring runtimes stay ignored. The static Vercel build includes only the referenced self-contained GLBs, the combined manifest, and the required local Three.js modules.

Models load per recipe rather than downloading the entire library on page load. Repeated ingredients share geometry. Unused model resources are released when switching dishes. The original burger library was reduced from about 39 MB to about 18 MB by encoding its embedded color maps and resizing oversized maps; its original source textures remain available.

## Functional checks

- Automated coverage enumerates all **2,216 catalog configurations**, verifies every referenced asset exists, and requires a different visible asset/transform recipe for every option combination.
- GLB validation includes finite transformed bounds, valid local paths, and embedded images/buffers without external dependencies.
- Existing tests cover cart pricing, persistence, deliberate ingredient removals, checkout/history, daily offers, and reduced-motion UI behavior.
- Async request tokens and modal cancellation prevent old ingredient loads replacing newer choices or reviving a closed dialog.
- Photos remain visible during loading or failure. Hidden canvases are removed from keyboard focus. Rotation, zoom, reset, assembly replay, keyboard controls, and reduced motion remain available.

## Visual review method

`node scripts/prepare-menu-review.js` records the exact recipes and placements used by the app for default, minimal, and fully loaded configurations. `scripts/food-assets/render_menu.py` imports the actual exported GLBs, normalizes them as the viewer does, and renders those placements. Review images therefore show the models, not generated beauty mockups. CPU rendering is available with `--cpu` if the local Metal driver fails.

Family review caught and corrected repeated pie layers, a brownie surface overlap, smooth cheesecake/cream surfaces, sauce contact, noodle contact, pancake/syrup material issues, and artificial directional fry texture. See family reports and actual model renders for the final evidence.

## Previous full-menu release verification

Release checks: **33 tests passed**, including all 2,216 configurations; the production build, JavaScript/Python syntax checks, and whitespace checks passed. The delivered library contains **76 self-contained GLBs**. The combined default contact sheet includes all 23 actual assembled dishes; family reviews additionally cover minimum and loaded configurations, including all four cold-brew scoop/size combinations.

The saved local-browser permission prevents interactive localhost testing. Offline renders do not establish browser or phone performance. Published implementation commit: `85784aedc15573e7529bda874f9dbbfff7fd5487` on GitHub `main`.

Production URL: https://appledesignlanguageamericandinerdop.vercel.app/

All **88 checked production files**, including **all 76 GLBs**, were fetched successfully and matched the release build byte-for-byte. The browser connection then reported unavailable when reloading the live app, so interactive WebGL behavior, mobile performance, and live interaction checks are **not claimed as verified**. The site remains published and all existing ordering-state tests pass.

## Breakfast, pickle, and glass refinement

The follow-up replaces repeated pancake and egg shapes with separate variants, softens scrambled eggs into rounded curds, adds bent and irregular breaded pickle spears, and rebuilds both glass vessels with smooth thin walls. Five drink volumes now fit the inner glass profile. Ingredients remain separate, and all existing option combinations retain distinct visible recipes. The library now contains **81 GLBs**.

Run `scripts/food-assets/refine-realism.py` with Blender after the original family authoring scripts. It reads the recorded Git baseline, preserves the original texture images, and deterministically regenerates the refined models and family manifests. The exact baseline, dimensions, and output sizes are in `assets/models/realism-refinement.json`.

Validation: **33 tests passed**, including all **2,216 configurations**; production build and source syntax checks passed. Default model reviews cover both pancake dishes, breakfast, pickles, all five drinks, and the sundae. Loaded portions are additionally rendered at 140 degrees for pancakes, breakfast, pickles, the cherry shake, and the sundae. Contact and topping placement are inspected in these actual exported models.

These are original textured CGI, not scans. Offline Cycles renders use different lighting/refraction from browser WebGL; glass reflections in particular can differ. Live interactive browser control remains unavailable, so no live visual, gesture, or phone performance pass is claimed. Production delivery should be verified by comparing the built modules, manifest, and all 81 models against their published URLs.
