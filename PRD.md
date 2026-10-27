# Good Hour Diner — Product requirements

Working Markdown copy of the user-supplied **Apple Design Language American Diner** PRD, version 1.0, dated October 27, 2026. Source: `Apple_Design_Language_Diner_PRD.docx`. Project 3 — Dopamine Site is due **November 4, 2026**. Good Hour is the established product name from the user's later design decisions. This document records product requirements; direct user instructions take precedence.

## Product overview

A browser-based simulation of ordering food at a fictional American diner. Visitors browse a menu, customize dishes, assemble meals, and complete an order without payment or delivery. The experience reproduces the anticipation and satisfaction associated with ordering food through an interface informed by Apple design conventions and classic American diner visual cues.

**Design claim:** “My site makes people feel excited and rewarded when they browse delicious diner food, build their perfect meal, and place an order without spending real money.”

## 1. Primary users

Teenagers and young adults who enjoy browsing restaurant menus, selecting food, customizing meals, and placing orders. They seek anticipation and satisfaction without a real transaction. The site is publicly accessible and requires neither registration nor personal information.

## 2. Problems to solve

- **Anticipation without spending:** provide the experience of choosing and ordering food without a purchase.
- **Limited feedback in simulated storefronts:** make browsing and ordering responsive through visual and interaction feedback.
- **Disconnected stages:** connect discovery, customization, cart, checkout, and fictional preparation in a coherent sequence that builds anticipation.
- **Impulsive purchasing:** make the simulated transaction explicit and show the amount of money not spent.

## 3. Capabilities

- Cinematic homepage with an original diner identity, featured meals, and access to the menu.
- Exactly 23 original menu items across five categories.
- Item-specific customization for toppings, ingredients, sizes, sides, and drinks.
- Meal and combo builder with entrée, side, drink, and responsive pricing.
- Interactive real-time 3D food models with animated ingredient assembly.
- Cart with add, remove, quantity adjustment, customization summary, and accurate totals.
- Simulated checkout without payment or personal details.
- Checkout confirmation, fictional kitchen stages, food-ready reveal, and itemized money-not-spent receipt.
- Persistent cart, meal configurations, order history, cumulative money-not-spent total, and sound preference.
- One clearly fictional purchasing-pressure mechanic, such as a limited-time special.
- One self-binding mechanic: cumulative money-not-spent tracking and receipt.
- Optional sound, playful interface animations, and an accessible mute control.

The fictional preparation stages are **order received → cooking → plating → ready → savings receipt**. No real preparation or delivery occurs.

## 4. Required inputs

| Menu category | Item count |
| --- | ---: |
| Burgers & Sandwiches | 6 |
| All-Day Breakfast | 4 |
| Sides & Appetizers | 4 |
| Milkshakes & Drinks | 5 |
| Desserts | 4 |
| **Total** | **23** |

Each catalog item needs an identifier, original name, description, category, fictional price, original image, and applicable customization options with price adjustments. Visitors select items, ingredients, combinations, quantities, and sound settings; they enter no personal data.

The application generates totals, order timestamps, preparation stages, order history, and cumulative money-not-spent amounts. Original AI-generated realistic food photography supports browsing. Procedurally generated Three.js assets support customization and checkout. Cart, meal configurations, orders, savings, and sound preferences persist in `localStorage`.

## 5. User flows

### First visit

1. Open the cinematic homepage and scroll directly to the menu.
2. Browse categories and select an item.
3. Customize a dish or assemble a combo; see real-time 3D updates and pricing.
4. Add the configured item to the cart.
5. Open the cart from floating navigation; adjust or remove items.
6. Complete simulated checkout.
7. View confirmation, fictional cooking and plating, and the food-ready reveal.
8. Receive a fictional itemized receipt and money-not-spent amount.
9. Return to the menu or review saved order history.

### Returning visitor

Restore local data on page load. Show a restrained welcome-back message and, if a cart is saved, an option to continue the order. Visitors may also begin a new order. Order history and cumulative savings remain accessible.

### Navigation

A floating translucent navigation bar remains accessible while scrolling. The cart opens as a slide-out panel without changing pages or losing scroll position. Order history is accessible through navigation.

## 6. Constraints

### Assignment and ethics

- No real purchases, payment processing, deliveries, accounts, or collection of names, emails, addresses, or other personal details.
- All store names, products, logos, and images are original; do not reproduce real brands or storefronts.
- No nicotine, vaping, alcohol, drugs, gambling, loot boxes, or similar restricted mechanics.
- At least two values persist after reload, including a working cart and an additional stored value.
- Include one purchasing-pressure mechanic and one self-binding feature, and explain both in the project reflection.
- Keep source in GitHub and publish through Vercel. Maintain `PRD.md`, `PLAYTEST.md`, checkpoint commits, and a Record of Thinking.

### Product

Desktop visual fidelity takes priority. Mobile and tablet layouts preserve essential ordering functions even where effects are simplified. Advanced effects must not break navigation, pricing, or persistence. Reduced-motion support, keyboard access, and sound controls are required. The initial menu is limited to 23 items.

## 7. Interface requirements

### Visual design

Use an Apple-influenced layout with large sans-serif headlines, generous whitespace, translucent surfaces, rounded corners, layered depth, and subtle retro diner lettering. The theme is **“Apple meets classic Americana.”**

| Color | Hex |
| --- | --- |
| Warm cream | `#FAF7F0` |
| White | `#FFFFFF` |
| Cherry red | `#C62828` |
| Chrome silver | `#B8BDC5` |
| Charcoal | `#202124` |

Use original realistic AI-generated food imagery for menu browsing and procedural 3D food for the interactive builder. Desktop supports cinematic hero imagery, scroll-based transitions, and persistent floating navigation.

### Motion and components

Motion may be energetic: floating food, ingredient assembly, elastic controls, cart feedback, particles, confetti, and animated kitchen sequences. Effects communicate state changes and support anticipation without obstructing tasks. Required components are the homepage, menu, meal builder, cart, checkout, kitchen sequence, food-ready reveal, receipt, and order history.

### Accessibility

Provide visible focus states, keyboard-operable controls, legible contrast, touch targets suitable for mobile, reduced-motion alternatives, and a sound mute control. Explain clearly that orders are fictional.

## 8. Technical constraints

| Area | Requirement |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript (ES6+) |
| 3D rendering | Three.js |
| Models | Original procedural geometry, materials, and textures |
| Motion | CSS and Three.js; GSAP optional |
| Persistence | Browser `localStorage` |
| Source control | GitHub |
| Deployment | Vercel |
| Backend, authentication, payments | None |

The 3D builder supports rotation, zoom, ingredient addition and removal, real-time customization updates, animated assembly, lighting, and shadows. Reuse procedural components across menu items. Non-customizable dishes may use original photography. When WebGL is unavailable, visitors must still be able to place simulated orders through a non-3D interface.

Use structured data for menu items, options, cart lines, and completed orders. Validate saved data while loading `localStorage`. Prices account for quantities, options, and combo rules. Checkout must not duplicate an order on reload.

## Three must-haves

1. **Functional ordering:** original menu, customization, combo builder, cart, and simulated checkout.
2. **Anticipation:** progressive feedback, a purchasing-pressure mechanic, fictional preparation, and food-ready reveal.
3. **Persistence and self-binding:** saved cart and order history, plus money-not-spent tracking and receipt.

## Out of scope

Real commerce, payments, delivery, accounts, personal-data collection, backend services, databases, administrative dashboards, copied brands, externally sourced 3D food models, and prohibited gambling or substance-related mechanics.

## Implementation priorities

1. Build the menu, pricing model, cart, and `localStorage` foundation.
2. Complete simulated checkout and both behavioral mechanics.
3. Implement procedural Three.js food models and live customization.
4. Add cinematic homepage, kitchen animation, checkout reveal, and optional effects.
5. Test usability, persistence, accessibility, responsive layouts, and deployment.

## Acceptance criteria

- All 23 original items appear in the correct categories.
- Supported customization and combo options update totals accurately.
- Visitors can add, remove, and adjust cart items; contents survive reload.
- Completed orders persist in history without duplication on refresh.
- Cumulative money not spent updates only for completed fictional orders.
- Both behavioral mechanics work and can be identified during playtesting.
- Checkout requests neither payment nor personal information.
- The fictional kitchen sequence and food-ready reveal complete successfully.
- The 3D builder reflects supported ingredient changes; a usable fallback exists without WebGL.
- Essential ordering flows work on desktop and mobile, with keyboard and reduced-motion support.
- The deployed Vercel site matches current GitHub source and required documentation is complete.

## Milestones and evaluation

| Date | Deliverable |
| --- | --- |
| October 29, 2026 | Both behavioral mechanics functional on the live site |
| November 3, 2026 | Playtesting, documented reactions to the design claim, planned revisions |
| November 4, 2026 | Final site deployed, playtest changes recorded, submission complete |

The primary evaluation is whether playtesters report the intended excitement and sense of reward. Secondary checks are completion of the ordering flow, accurate persistence and totals, clarity that purchases are fictional, and documented changes following testing.

Source basis in the supplied PRD: Project 3 — Dopamine Site assignment (October 20, 2026) and the eight approved PRD sections from the user's planning conversation.
