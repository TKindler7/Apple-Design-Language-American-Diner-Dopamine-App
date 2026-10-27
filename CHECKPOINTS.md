# Project checkpoints

## CP1 — 2026-10-22: starter cart persists

The menu has three original diner items. The cart supports add, increase, decrease, and remove, displays a running total, and saves in browser `localStorage`.

Acceptance check performed in the browser:

1. Added The Midnight Stack ($14) and Sunrise Flapjacks ($11).
2. Confirmed the cart showed two items and a $25 total.
3. Reloaded the page and reopened the cart; both items and the $25 total remained.
4. Removed The Midnight Stack and confirmed the total changed to $11.

Automated checks at CP1: `npm test` (3 passing) and `npm run build` (all local asset references found). The diner was subsequently renamed Good Hour; cart contents migrate without being lost.

## CP2 — 2026-10-27: full PRD implementation

Expanded the prototype to 23 configurable items and meals, original food imagery and procedural 3D, fictional checkout/kitchen/receipt, completed-order history, sound preference, and both behavioral mechanics. The daily special is available from local 08:00 to midnight; money not spent is calculated from completed fictional orders only.

The production build and 19 automated checks pass. The PRD, playtest protocol, design system, and Record of Thinking are present. Implementation commit `a7517f7` is published on GitHub and Vercel; production code, vendor modules, and all 24 display images match the tested build byte for byte. Integrated browser checks remain blocked by the saved or managed preview permission; see `PLAYTEST.md` for exact evidence and remaining checks.

Next school milestones: both mechanics live by October 29; real participant playtests by November 3; final submission November 4. Agent checks do not substitute for human playtesting.
