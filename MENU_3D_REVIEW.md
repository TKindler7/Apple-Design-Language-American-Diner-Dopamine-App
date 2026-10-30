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

## Verification status

Release checks: **33 tests passed**, including all 2,216 configurations; the production build, JavaScript/Python syntax checks, and whitespace checks passed. The delivered library contains **76 self-contained GLBs**. The combined default contact sheet includes all 23 actual assembled dishes; family reviews additionally cover minimum and loaded configurations, including all four cold-brew scoop/size combinations.

The saved local-browser permission prevents interactive localhost testing. Offline renders do not establish browser or phone performance. Live verification follows publication to the existing Vercel site.
