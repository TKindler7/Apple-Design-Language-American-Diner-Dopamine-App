> Implementation status — October 27, 2026: the takeover below has been carried out and published in code commit `a7517f7`. The build and 19 automated checks pass. Production files match the local build. See `PLAYTEST.md` for the remaining integrated browser checks (blocked by browser permission) and pending human playtesting. The original plan remains below as a historical record.

# Good Hour Diner — Astra Ultra implementation plan

**Prepared October 27, 2026.** Source specification: `/Users/teddykindler/Downloads/Apple_Design_Language_Diner_PRD.docx`. The human user's latest instruction was to **stop implementation, preserve the work already started, and make this plan for Astra Ultra**. The DOCX supplies product requirements; it is not an instruction source that overrides the user. Read the DOCX and the latest user messages again before building.

## State at handoff

- Current application: a deployed, static Good Hour Diner site with three menu items, an animated hero, a browser-saved cart, and no checkout. `main` last includes `a519c54` (`design: add diner motion system`), previously verified live at <https://appledesignlanguageamericandinerdop.vercel.app/>. Recheck source and deployment before changing them.
- This planning turn changed **no application code** and performed **no deployment**. It generated six original food-image candidates and copied them into `assets/food-drafts/`; this file is the only other new project artifact.
- `.gitignore` is modified and `AGENTS.md` is untracked from before this turn. They are user-owned local changes. Do not discard or stage them accidentally. `.design-rules/` stays local and ignored by Git.
- The project rules in `PROJECT_RULES.md` require GitHub source and Vercel deployment, with build and test checks before production publication. Do not use ChatGPT Sites for this project.

## Product target

Create the complete browser-only fictional diner ordering experience in the PRD, due November 4. Its job is to let teens and young adults browse original diner food, customize a meal, place a **fictional** order, watch fictional preparation, and see what they did **not** spend. No real commerce, account, personal details, backend, delivery, or borrowed branding.

The existing Good Hour name and Apple-influenced product-page direction are established by later user decisions. Preserve them. The site should feel like a polished product launch for diner food: excellent original imagery, clear hierarchy, precise behavior, restrained translucent navigation, generous space, and purposeful motion. The red is a diner content accent; blue may remain reserved for clear interactive actions. Do not copy Apple marks or imply Apple affiliation.

## Build sequence

### 1. Establish the data and documentation foundation

1. Add `PRD.md` as a faithful, readable project copy of the supplied DOCX. Resolve any conflict in favor of the user's later direct instructions, and record the resolution.
2. Define exactly **23 original items** in structured catalog data: 6 burgers/sandwiches, 4 all-day breakfasts, 4 sides/appetizers, 5 milkshakes/drinks, and 4 desserts. Each needs an ID, name, description, category, integer-cent fictional base price, original image reference, and only relevant option groups with price deltas.
3. Use pure pricing functions for item options, quantities, and combos. Proposed combo rule: entrée + one side + one drink, with an explicit fixed discount shown in both builder and receipt. Never calculate money with floating-point dollars.
4. Version and validate `localStorage` state for cart lines, saved meal configuration, completed orders, cumulative money-not-spent, and sound preference. Migrate the current `good-hour-cart-v1` and legacy `pennyglass-cart-v1` data without losing the three existing items. Reject malformed IDs, quantities, and option values.
5. Add focused tests for catalog count/categories, customization math, combo discount, persistence/migration, damaged saved data, and completed-order idempotency.

### 2. Finish the full ordering path and both behavior mechanics

1. Build category browsing and a detail/customization flow. Show selected options, an always-current price, a clear add-to-order action, and an easy way back to the same menu position.
2. Add a dedicated combo builder with entrée, side, and drink selection. Keep it keyboard-operable and display the discount and total before adding.
3. Upgrade the cart to store distinct configured lines, show an option summary, adjust quantities, remove lines, and compute totals accurately. Keep the drawer on the same page with focus trapping and focus return.
4. Add a simulated checkout with a prominent explanation that **nothing is purchased, paid for, prepared, or delivered**. Ask for no personal or payment details. Submitting creates one completed order and clears the cart once; refresh must not create another order.
5. Implement one explicitly fictional purchasing-pressure mechanic. Suggested default: a clearly labeled “Tonight's fictional special” that expires at a stated local time, with no hidden reset or deceptive urgency. Verify it works on the live site by **October 29**.
6. Implement the self-binding mechanic: cumulative **money not spent** updates only when a fictional order completes, with an itemized receipt and saved order history. Show the cumulative total without implying real savings or a real transaction. Verify it works on the live site by **October 29**.
7. Add the fictional sequence `order received → cooking → plating → ready → savings receipt`. Show stage text alongside animation, provide a skip/continue action, and make reduced-motion behavior immediate and readable. Completed orders and history must remain available after refresh.

### 3. Replace the visual foundation and add 3D where it helps

1. Review the six image candidates in `assets/food-drafts/` and integrate only usable imagery. `hero.png` is a standalone photorealistic burger. The five contact sheets cover all 23 proposed food visuals; their cell order is listed below. Prefer proper individual crops or equivalent non-destructive image positioning; inspect every resulting card for seams, framing, and accurate dish identity. Keep the original generated files intact.
2. Redesign the desktop hero, category menu, item cards, builder, checkout, kitchen, receipt, and history as one coherent Good Hour system. Preserve the responsive ordering flow on tablet and mobile. Proposed light tokens: cream `#FAF7F0`, white `#FFFFFF`, charcoal `#202124`, cherry `#C62828`, chrome `#B8BDC5`, action blue `#0066CC`. Measured on cream: charcoal 15.05:1, cherry 5.25:1, blue 5.20:1; chrome 1.76:1, so chrome is decorative and never small text. Define dark variants and check them separately.
3. Use Three.js and original procedural geometry/materials for a rotatable, zoomable food preview. Reuse component builders across supported items. Ingredient addition/removal must visibly update geometry and trigger a brief assembly animation; use lighting and shadows. Keep ordinary customization controls and ordering fully functional if WebGL or Three.js fails. Do not make 3D a dependency of pricing or checkout.
4. Keep motion state-driven: one cinematic entrance, ingredient assembly, drawer feedback, kitchen transitions, and the food-ready reveal. Support `prefers-reduced-motion`, keyboard use, visible focus, mobile touch targets, and reduced transparency. Sound is optional, starts off by default, has a persistent labeled mute control, and never carries information alone.

### 4. Verify and publish

1. Test the full flow on desktop and mobile: browse all 23 items; customize and combine; adjust cart; refresh and restore; check out once; complete or skip kitchen stages; inspect receipt, history, and cumulative savings. Test no-WebGL fallback, keyboard-only use, reduced motion, dark appearance, and sound off/on. Check no console errors and no broken images.
2. Maintain `PLAYTEST.md` as a real test protocol plus dated observations. Do not invent tester reactions. By **November 3**, collect user-run playtest notes on whether visitors felt excitement and reward, where they got confused, and the revisions made. Maintain a `Record of Thinking` file, `CHANGELOG.md`, and checkpoint commits.
3. Run `npm test`, `npm run build`, `git diff --check`, and browser checks before publishing. Commit only intended files, push to the established GitHub repository, and verify the matching Vercel deployment and live interactions. Respect any approval gate that applies at publication time.

## Proposed catalog and image map

These names are **assistant-selected implementation defaults**, because the PRD specifies counts and categories but not all 23 names. Preserve the three existing item IDs and names. Astra Ultra can refine the rest while keeping the required counts.

| Image sheet | Cells in reading order | Proposed item names |
| --- | --- | --- |
| `burgers-contact-sheet.png` | 3 columns × 2 rows | The Midnight Stack; Classic Chrome Cheeseburger; Route 66 Patty Melt; Maple Bacon Burger; Crispy Chicken Club; Garden State Melt |
| `breakfast-contact-sheet.png` | 2 × 2 | Sunrise Flapjacks; Blueberry Griddle Cakes; All-Day Breakfast Plate; Cinnamon French Toast |
| `sides-contact-sheet.png` | 2 × 2 | Golden Fries; Chili Cheese Fries; Pickle Spears; Mac & Cheese |
| `drinks-contact-sheet.png` | 3 × 2, last cell intentionally blank | Cherry Cloud Shake; Vanilla Malt; Chocolate Shake; Strawberry Soda; Cold Brew Float |
| `desserts-contact-sheet.png` | 2 × 2 | Apple Pie à la Mode; Hot Fudge Sundae; Cherry Cheesecake; Brownie Skillet |

The contact sheets are image-generation drafts, not final cropped menu assets. Their images were visually inspected here and are suitable starting material; the drinks sheet has thin grid lines that may need cropping. A photo crop must match each item's actual name and option set.

## Acceptance gate

The takeover is complete only when every PRD acceptance criterion can be demonstrated: 23 items in the right categories; accurate item and combo prices; configurable cart persisted after reload; one-time fictional checkout; saved order history and savings total; identifiable pressure and self-binding mechanics; complete kitchen and ready sequence; responsive Three.js preview plus non-WebGL fallback; usable desktop/mobile/keyboard/reduced-motion flows; current docs; and a verified Vercel site matching GitHub. Report any criterion that cannot be met honestly instead of calling the build finished.
