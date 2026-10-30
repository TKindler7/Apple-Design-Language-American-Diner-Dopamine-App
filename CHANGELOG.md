# Changelog

## 2026-10-29 — Textured 3D across the complete menu

- Replaced the main procedural food viewer with original, separately textured GLB ingredients for all 23 dishes, including the fictional kitchen preview.
- Preserved all 2,216 ingredient/portion combinations and existing cart, pricing, draft persistence, checkout, and history behavior.
- Added new bread, chicken, breakfast, side, drink, and dessert assets through original chat-generated textures and local Blender authoring. No Hugging Face or external paid 3D generation is required.
- Corrected food contact, frying texture, sauce shapes, cream folds, egg surfaces, pie filling, brownie overlap, and hollow macaroni after inspecting exported models.
- Added per-recipe loading, bounded resource cleanup, cancellation-safe option changes, accessible loading/photo fallbacks, and stable camera framing so larger portions visibly grow.
- Preserved smooth rotation/zoom/reset and assembly replay; ingredient changes settle into place without replaying the entire dish. Reduced-motion behavior remains supported.
- Reduced the burger library from roughly 39 MB to 18 MB through texture encoding. Deployment includes only referenced models, not authoring tools or source texture sheets.
- Added exhaustive recipe/asset tests and reproducible actual-model render review. See MENU_3D_REVIEW.md for final validation and deployment evidence.

## 2026-10-29 — One-burger textured 3D pilot

- Added an isolated Midnight Stack review page with separate bun, patty, cheese, vegetable, bacon, and sauce GLBs. The normal menu viewer remains unchanged.
- Authored original ingredient meshes and chat-generated photographic food textures in Blender; retained original texture prompts and authoring scripts. No Hugging Face account or model weights are used by this pilot.
- Preserved all 576 catalog configurations, with shared extra-patty geometry, contact-aware stacking, rotation, zoom, keyboard controls, assembly replay, reduced motion, and an explicitly labeled original-image fallback.
- Corrected stretched meat/bread texture mapping, bun shading, transformed seed bounds that lifted the bun, slice normals, onion cross sections, and pickle surfaces during actual-model render review.
- Packaged only the manifest and embedded-texture GLBs for the preview; source images, local authoring tools, and model-weight setup are excluded from deployment output.
- All 30 project tests and the build pass. Offline renders inspect the real GLBs. Interactive browser verification is still blocked by the saved local-page permission, so no browser or mobile performance pass is claimed. The pilot has not been deployed or expanded to the remaining menu.

## 2026-10-27 — Diner motion pass

- Added a one-time ingredient-by-ingredient hero animation, timed with the headline and plate light.
- Added once-only scroll reveals for the menu and food spotlights, with static content when JavaScript or IntersectionObserver is unavailable.
- Refined order-drawer open and close motion, item entrances, and bag-count feedback.
- Kept animations optional for reduced-motion visitors and limited motion to opacity and transforms.

## 2026-10-22 — Good Hour redesign

- Renamed Pennyglass Diner to Good Hour Diner across the site, favicon, and project documentation.
- Rebuilt the page into a clearer product narrative: a tighter hero, earlier food art, a short menu introduction, and full-width breakfast and shake spotlights.
- Applied a custom Apple-inspired token system with high-contrast type, restrained blue actions, diner cherry in the content layer, and subtle glass limited to navigation and the order drawer.
- Added responsive, dark-appearance, increased-contrast, reduced-transparency, and reduced-motion treatments.
- Migrated carts saved under the old name so existing orders survive the rebrand.

## 2026-10-22 — CP1 starter cart

- Created the original Pennyglass Diner concept, three menu items, and illustrated site.
- Added a cart with item removal, quantity controls, total, and reload persistence through `localStorage`.
- Added browser accessible dialog controls and automated cart persistence checks.
- Updated the build script to generate the `public/` folder required by the connected Vercel project.
- Reworked the site into a cleaner product-page design with slim navigation, large system typography, focused product sections, and simple blue controls.

## 2026-10-27 — Full PRD implementation

- Replaced the three-item prototype presentation with an original photographic diner homepage, five menu categories, and 23 configurable dishes.
- Added entrée/side/drink combos, exact option pricing, a clearly fictional daily special, and customized cart lines.
- Added original procedural Three.js food previews, ingredient changes, rotation, zoom, assembly, and photographic fallback.
- Completed simulated checkout, kitchen progress, ready reveal, itemized receipts, history, and cumulative money-not-spent tracking.
- Persisted the cart, latest configuration, completed orders, and optional sound preference; retained migration from both earlier cart keys.
- Added responsive and accessibility treatments, reduced-motion alternatives, keyboard preview controls, and optional audio.
- Prepared optimized WebP imagery and production packaging with local Three.js modules; excluded source image drafts from deployment output.
- Added the PRD, playtest protocol, Record of Thinking, and data integrity tests. Human playtesting remains pending.

## 2026-10-29 — Motion throughout the diner

- Added scroll-driven camera movement to the photographic hero and staggered burger, fries, and shake assembly in the meal showcase.
- Added a sliding menu-category indicator, crossfading category changes, and restrained hover/focus lift on food cards.
- Made removed 3D ingredients lift, fade, and shrink away; retained layers settle and rotation, zoom, reset, and framing ease smoothly. Direct gestures interrupt these finite transitions.
- Connected adding an item to its arrival in the cart, animated quantity and price changes, and matched dialog closing motion to its entrance.
- Added cooking steam and warmth, a plating transition, connecting stage progress, receipt arrival, and a one-time money-not-spent count-up.
- Preserved immediate state updates, exact accessible prices, reduced-motion alternatives, hidden-tab cleanup, and photo fallback. Closing dialogs are inert to prevent keyboard submissions during their exit.
- Kept the existing checkpoint documentation and prepared a normal history-preserving merge for publication. Visual browser verification remains subject to the saved local-preview permission.

## 2026-10-29 — 3D food surface refinement

- Added shared seamless fine/coarse surface detail and roughness variation throughout the food models, plus slight organic irregularity on curved food geometry.
- Added a warm rim light and reduced ambient/exposure washout to make ingredient depth clearer; moist surfaces receive a restrained clearcoat highlight.
- Build and 27 tests pass. The isolated 3D harness passes all 23 recipes, option changes, interrupted animation, reduced motion, and disposal. Browser visual assessment remains pending; this is a procedural realism improvement, not a claim of photographic fidelity.

## 2026-10-29 — Corrections from the live 3D review

- Inspected all 23 existing food previews on the production site and identified excessive highlights, stretched surface detail, rigid ingredient shapes, intersecting drink surfaces, and overly geometric desserts.
- Reworked food textures and lighting, kept bread and fried surfaces matte, softened patties and chicken, and gave lettuce finer, gentler folds.
- Replaced pancake rims and disc-shaped syrup with uneven edges and thin pools; improved eggs, potatoes, cheese drizzle, and the fullness of macaroni.
- Matched drink contents to the curved inner glass, added a meniscus and rim, and tapered the whipped cream.
- Added apple filling, pastry edges, cheesecake crumbs and compote, brownie cracks, irregular ice-cream scoops, and thin chocolate ribbons.
- A second live inspection prompted supported cheese geometry, contact-based sandwich spacing, visible French-toast syrup, flatter grill marks and chocolate ribbons, warmer pie filling, visible soda ice, and less regular fried-food shapes.
- Final refinements give eggs continuous browned edges and project melted cheese onto the actual fries, while keeping chocolate visible on scoops and on brownies when ice cream is removed.
- Build, 27 tests, JavaScript syntax, whitespace, and the all-23-model lifecycle harness pass. Production visual results are recorded separately in `PLAYTEST.md`.
