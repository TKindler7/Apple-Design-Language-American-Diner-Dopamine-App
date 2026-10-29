# Good Hour Diner

An original American diner presented like a premium product launch. Browse 23 dishes, customize a procedural 3D preview, build a meal, and follow a fictional order from the kitchen to a money-not-spent receipt.

Live site: https://appledesignlanguageamericandinerdop.vercel.app/

**Design claim:** My site makes people feel excited and rewarded when they browse delicious diner food, build their perfect meal, and place an order without spending real money.

## The experience

- Five menu categories, original food photography, and dish-specific choices.
- Real-time Three.js food previews with rotation, zoom, ingredient changes, assembly, lighting, and shadows. A photographic fallback preserves ordering when 3D is unavailable.
- Entrée, side, and drink combos with a $3 fictional discount; an explicitly fictional daily special.
- Configured cart lines, quantities, review, simulated kitchen stages, and an itemized receipt. No payment fields, accounts, personal information, food preparation, or delivery.
- Browser-saved cart, latest meal draft, order history, money-not-spent total, and optional sound preference. Original prototype carts migrate automatically.
- Keyboard controls, responsive layouts, reduced motion, dark appearance, and muted sound by default.

## Run and verify

Requires a current Node.js installation and npm.

```sh
npm ci
npm test
npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory public
```

Open http://127.0.0.1:4173/. Serve `public/`, which contains the app and its local Three.js modules. Rebuild after source edits. Vercel runs `npm run build` and publishes `public/`. The build checks HTML and catalog image references and excludes the large source-image drafts.

## Project records

- [PRD.md](PRD.md): product requirements and school milestones.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): visual and interaction decisions.
- [PLAYTEST.md](PLAYTEST.md): technical evidence and human playtest protocol. Human reactions remain pending.
- [RECORD_OF_THINKING.md](RECORD_OF_THINKING.md): rationale, tradeoffs, and reflection.
- [CHANGELOG.md](CHANGELOG.md) and [CHECKPOINTS.md](CHECKPOINTS.md): implementation history.

All food imagery and procedural models are original. AI-generated image sources and provenance are retained in `assets/food-drafts/`; optimized display images are in `assets/food/`. Three.js is MIT licensed and its license is included in the build. Apple-inspired layout conventions do not imply Apple affiliation; the site uses its own name, mark, content, and diner identity. Local design guidance stays in the ignored `.design-rules/` directory.
