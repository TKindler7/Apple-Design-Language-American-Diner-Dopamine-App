# Photorealistic 3D replacement

Requested October 29, 2026. Status: asset production is blocked; no photorealistic 3D replacement has been generated or deployed.

## Target and current limitation

Replace the lightweight procedural food with original, detailed, textured 3D assets that hold up when rotated and viewed closely. The previous surface pass remains stylized. Changing colors, adding noise, or replacing the preview with a photograph does not meet this request.

Keep the existing Apple-inspired page layout, original diner identity, cart, pricing, saved orders, keyboard controls, reduced-motion behavior, and photo fallback. The local design skill remains the UI guidance. Loading must leave usable content and controls on screen, following its loading and motion references.

## Confirmed product decision

On October 29, 2026, the user selected **Keep visible ingredient customization**. Adding, removing, or changing ingredients must continue to update the visible 3D food. Rotation, zoom, and ingredient assembly must remain usable. Replacement assets must therefore contain separate, named ingredient meshes or use independently authored ingredient assets with compatible contact points. A fused complete-dish model is insufficient for this requirement.

The current catalog has 2216 supported item configurations. Twenty-three complete-dish models do not cover all of them.

## Verified generation availability

Read-only preflight through the connected Higgsfield tools on October 29, 2026:

- Tripo H3.1 image-to-3D: 18 credits for one textured PBR model with detailed geometry and textures, target 80,000 faces. Reference used for the quote: the site's original Midnight Stack image.
- Twenty-three comparable complete-dish generations would total 414 credits before retries or variants. This historical comparison is **not the budget for the selected modular approach**, which requires a separate quote after the ingredient assets and production method are defined.
- Asset generation has not started. Funding and permitted generation capacity must be confirmed before submitting jobs.
- Tripo P2 with extreme textures, 50,000 faces and PBR quoted 40 credits for one model; it is not a lower-cost route for the requested detail.
- No generation was submitted and no credits were spent. Original user-supplied GLB assets with permission for this project are another possible source.

## Pilot before broad production

1. Produce an original high-resolution food reference for one burger, based on the established recipe and original imagery.
2. Generate or author a modular textured burger pilot with separate top/bottom buns, patty, cheeses, produce, bacon, and sauces; retain source references, generation parameters, and provenance. Reuse the patty for the extra-patty option.
3. Inspect the actual mesh, material maps, back and underside, and ingredient separability. Hidden surfaces must have complete geometry and textures so removing a topping reveals convincing food. Do not infer quality or modularity from the generation status or thumbnail.
4. Load it in the site's real viewer. Inspect a full rotation, close-up, shadows, color, and ingredient contact. Exercise no cheese, both cheese types, every topping toggle, an extra patty, all sauces, rapid removal/reselection, and replay. Changing an ingredient must not reveal a baked image of the removed ingredient elsewhere on the model.
5. Proceed to the remaining menu only once the pilot meets the photographic target. Regenerate or author missing details rather than labeling a visibly stylized result photorealistic.

## Asset families for visible customization

- Burgers and sandwiches: separate upper/lower buns and bread, beef and chicken, cheddar/Swiss, lettuce, tomato, pickles, onion, bacon, sauces, mushrooms, peppers, zucchini, avocado. Support surfaces and attachment points must keep layers touching after removals.
- Breakfast: repeatable pancake and French-toast pieces, butter, syrup, berries, chips, cream, eggs in each style, bacon/sausage/mushrooms, potatoes, toast and avocado.
- Sides: fries, fried pickles, macaroni, chili, cheese sauce, crumbs, onion and dips. Sauce variants need to fit the underlying food rather than float over it.
- Drinks: glass, liquid for each flavor, ice, cream, cherry, sauce, straw and ice-cream flavors. Use physically appropriate transparent materials and verify refraction on target browsers.
- Desserts: pastry and apple filling, cheesecake and crust, brownie and skillet, ice-cream scoops, cream, compote, chocolate and nuts. Sauce must fit both topped and untopped configurations.

These are asset requirements, not a verified generation count. Shared components can reduce duplication, but generated whole-dish meshes may need manual separation or replacement.

## Viewer implementation

- Add a versioned asset manifest mapping recipe IDs and ingredient keys to GLB files, scale, orientation, contact anchors, bounds, and provenance.
- Package the matching Three.js GLTFLoader and its local utilities. Rewrite bare imports or supply an import map. Inspect compression extensions before adding required decoders.
- Preserve the current scene interface: update, rotate, zoom, reset, assemble and dispose. Use request tokens and cancellation-safe loading to prevent an outdated request replacing a newer selection.
- Preserve imported color, normal, roughness and other PBR maps. Use neutral studio environment lighting, correct color spaces, restrained exposure, and camera framing derived from asset bounds.
- Avoid adding a second procedural plate when an imported asset already includes one.
- Load one recipe at a time, keep caching bounded, and dispose geometry, materials, textures, and temporary image resources. Retain the photo while loading or when WebGL fails.
- Package models and manifest through the existing Vercel build. Do not switch hosting.

## Menu coverage

| Dish | Current model family | Configurations | Option groups |
| --- | --- | ---: | --- |
| The Midnight Stack | burger | 576 | Cheese, Toppings, Sauce |
| Classic Chrome Cheeseburger | burger | 576 | Cheese, Toppings, Sauce |
| Route 66 Patty Melt | sandwich | 48 | Cheese, Toppings, Bread |
| Maple Bacon Burger | burger | 576 | Cheese, Toppings, Sauce |
| Crispy Chicken Club | sandwich | 48 | Toppings, Sauce |
| Garden State Melt | sandwich | 48 | Cheese, Vegetables |
| Sunrise Flapjacks | pancakes | 64 | Stack, Toppings |
| Blueberry Griddle Cakes | pancakes | 64 | Stack, Toppings |
| All-Day Breakfast Plate | breakfast | 48 | Eggs, On the side, Complete the plate |
| Cinnamon French Toast | toast | 32 | Portion, Toppings |
| Golden Fries | fries | 8 | Size, Extras |
| Chili Cheese Fries | fries | 16 | Size, Toppings |
| Pickle Spears | pickles | 6 | Size, Dip |
| Mac & Cheese | mac | 8 | Size, Finish |
| Cherry Cloud Shake | shake | 16 | Size, Finish |
| Vanilla Malt | shake | 16 | Size, Finish |
| Chocolate Shake | shake | 16 | Size, Finish |
| Strawberry Soda | soda | 6 | Size, Ice |
| Cold Brew Float | float | 8 | Size, Ice cream, Finish |
| Apple Pie à la Mode | pie | 8 | Finish |
| Hot Fudge Sundae | sundae | 16 | Finish |
| Cherry Cheesecake | cheesecake | 4 | Finish |
| Brownie Skillet | brownie | 8 | Finish |

## Acceptance checks

- Inspect all 23 recipes live, including front, side, rear and close views; texture detail must remain convincing as the camera moves.
- Where ingredient customization is retained, verify representative additions/removals and edge combinations; the preview must agree with the order.
- Check true glass, moist surfaces, crust/crumb detail, food contact, sauce placement and shadows. No plastic coating, stretched textures, floating toppings, baked-in backdrop, or duplicate dishes.
- Validate model downloads, mobile memory/frame rate, keyboard controls, reduced motion, fallback, rapid model switching, disposal, unchanged pricing and persistence.
- Run the existing build and behavioral tests. Publish through GitHub/Vercel and confirm the deployed assets before claiming completion.
