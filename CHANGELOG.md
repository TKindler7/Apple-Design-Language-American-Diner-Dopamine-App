# Changelog

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
