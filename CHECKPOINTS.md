# Project checkpoints

## CP1 — 2026-10-22: starter cart persists

The menu has three original diner items. The cart supports add, increase, decrease, and remove, displays a running total, and saves in browser `localStorage`.

Acceptance check performed in the browser:

1. Added The Midnight Stack ($14) and Sunrise Flapjacks ($11).
2. Confirmed the cart showed two items and a $25 total.
3. Reloaded the page and reopened the cart; both items and the $25 total remained.
4. Removed The Midnight Stack and confirmed the total changed to $11.

Automated checks at CP1: `npm test` (3 passing) and `npm run build` (all local asset references found). The diner was subsequently renamed Good Hour; cart contents migrate without being lost.
