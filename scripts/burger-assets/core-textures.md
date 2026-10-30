# Original burger core texture sources

The three `core-*-albedo.png` images in `assets/models/burger-pilot/textures/` were made with the built-in image-generation tool in this chat on October 29, 2026. They are original raster material sources, not scanned meshes and not downloaded stock assets. No external paid image or 3D service was used.

`core.py` authors closed, editable 3D bun and patty meshes. It projects the source colors in three dimensions and bakes the results into non-overlapping UV atlases with portable tangent-space normals. Actual sesame seed geometry is retained. JPEG encoding is a production export step; the original generated PNGs remain unchanged. Every final GLB embeds its materials and textures and has applied object transforms so bounds and ingredient stacking agree.

The generated whole-ingredient `references/bun-top.png` and `references/patty.png` are visual development references only. They are not displayed as fake 3D views or directly used as billboards.

## Built-in image-generation prompts

### core-brioche-albedo.png

> A seamless tileable physically based COLOR texture atlas for a 3D food model: an extreme close-up of an actual golden brown brioche hamburger bun crust, photographed directly perpendicular to the surface, not a whole bun. Full frame filled edge-to-edge with very fine realistic baked bread pores, subtle shallow wrinkles and tiny toasted cracks, rich amber brown softly varying with honey-gold, no black char. No sesame seeds, no flour, no slice edge, no background, no perspective, no depth of field, no shadows, no directional light or glossy white highlights, no text. Completely even diffuse cross-polarized illumination suitable as a PBR albedo map. Truly photographic natural bread surface, not a drawing or procedural noise. Fine scale: whole square represents about 14 centimeters across. Seamless on all four edges. Square high resolution texture.

### core-beef-albedo.png

> Create a seamless tileable PBR BASE COLOR texture for an original realistic 3D cooked hamburger patty. This is NOT a photograph of a whole patty. Full square frame entirely filled with a real close-up surface of coarse ground beef seared dark mahogany brown on a hot griddle. Fine irregular craggy browned meat, some darker toasted caramelized crevices and small warmer brown meat grains. No pink raw meat, no white raw fat, no grill stripes, no garnish, no backdrop. Cross-polarized completely even diffuse light, no cast shadows, no specular white highlights, no gradients or vignette. Color should be rich moderately dark roasted beef brown, not orange, not black burnt, not chocolate. Extremely fine photographic food detail at a scale representing about 12 centimeters across. Seamless square texture, no text or labels.

### core-crumb-albedo.png

> A square seamless PBR base color food texture, full frame close-up of the freshly cut interior crumb of a real soft brioche hamburger bun. Warm pale cream with a subtle golden tint, fine irregular tiny air pores and fibrous delicate bread structure, a few softly toasted pale golden patches, no crust edge, no whole bun, no background or plate, no butter. Flat surface viewed exactly perpendicular, completely uniform diffuse cross-polarized illumination with no directional shadows or specular highlights. Natural bakery macro photography, true organic fine detail, not sponge, foam, stone or a cartoon. The square represents a 12 centimeter-wide surface. Seamless/tileable all edges, no text or markings.

## Rebuild and review

Run `.local-ai/tools/Blender.app/Contents/MacOS/Blender --background --python scripts/burger-assets/core.py` from the project root. This uses the locally installed official Blender 4.5.15; no network access or accounts are involved. It exports `bun-top.glb`, `bun-bottom.glb`, and `patty.glb`, writes triangle/file-size provenance, and renders the actual partial stack at `.local-ai/previews/core-burger.png`.

Photographic source textures do not by themselves establish photorealism. The full assembled burger must be inspected in the browser with ingredient removal/addition, varied camera views, and its real lighting before acceptance.
