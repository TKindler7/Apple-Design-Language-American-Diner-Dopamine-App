# Project checkpoints

## CP1 — 2026-10-22: starter cart persists

The menu has three original diner items. The cart supports add, increase, decrease, and remove, displays a running total, and saves in browser `localStorage`.

Acceptance check performed in the browser:

1. Added The Midnight Stack ($14) and Sunrise Flapjacks ($11).
2. Confirmed the cart showed two items and a $25 total.
3. Reloaded the page and reopened the cart; both items and the $25 total remained.
4. Removed The Midnight Stack and confirmed the total changed to $11.

Automated checks at CP1: `npm test` (3 passing) and `npm run build` (all local asset references found). The diner was subsequently renamed Good Hour; cart contents migrate without being lost.

## CP2 — 2026-10-29: PRD-lite

`PRD.md` records the design claim, three must-haves, and out-of-scope work for Good Hour Diner. It also defines the original menu, fictional checkout, persistence, behavioral mechanics, and accessibility goals.

## CP3 — 2026-10-29: my store

Good Hour Diner is an original fictional diner with 23 configurable menu items, original food imagery, procedural 3D previews, a cart, simulated checkout, kitchen sequence, receipt, and saved history. It uses no real brands, accounts, personal information, payments, preparation, or delivery.

## CP4 — 2026-10-29: two mechanics

The clearly fictional time-limited special is the purchasing-pressure mechanic. The completed-order receipt and cumulative money-not-spent total are the self-binding feature. The special’s schedule and pricing behavior are tested in `test/special.test.js`.
