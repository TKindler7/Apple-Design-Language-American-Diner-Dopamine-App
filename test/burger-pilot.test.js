import test from "node:test";
import assert from "node:assert/strict";
import { burgerPilotLayers, burgerPilotPlacements, PILOT_INGREDIENTS, validateBurgerPilotManifest } from "../burger-pilot-model.js";
import { ITEM_BY_ID } from "../catalog.js";

test("every Midnight Stack combination maps to separate removable ingredients", () => {
  const groups = ITEM_BY_ID["midnight-stack"].options;
  const toppings = groups.find(group => group.id === "toppings").choices.map(choice => choice.id);
  const signatures = new Set();
  for (const cheese of ["cheddar", "swiss", "none"]) for (const sauce of ["house", "smoky", "none"]) {
    for (let mask = 0; mask < 2 ** toppings.length; mask++) {
      const selected = toppings.filter((_, index) => mask & (1 << index));
      const layers = burgerPilotLayers({ cheese, sauce, toppings: selected });
      assert.equal(layers[0].id, "bun-bottom");
      assert.equal(layers.at(-1).id, "bun-top");
      assert.equal(new Set(layers.map(layer => layer.id)).size, layers.length);
      assert.equal(layers.filter(layer => layer.asset === "patty").length, selected.includes("extra-patty") ? 2 : 1);
      assert.equal(layers.some(layer => layer.id === "cheese"), cheese !== "none");
      assert.equal(layers.some(layer => layer.id === "sauce"), sauce !== "none");
      if (cheese !== "none") assert.equal(layers.find(layer => layer.id === "cheese").asset, cheese);
      if (sauce !== "none") assert.equal(layers.find(layer => layer.id === "sauce").asset, `sauce-${sauce}`);
      for (const topping of toppings) assert.equal(layers.some(layer => layer.id === topping), selected.includes(topping));
      for (const layer of layers) assert.ok(PILOT_INGREDIENTS.includes(layer.asset));
      if (selected.includes("lettuce")) assert.ok(layers.findIndex(layer => layer.id === "lettuce") < layers.findIndex(layer => layer.id === "patty"));
      if (selected.includes("tomato")) assert.ok(layers.findIndex(layer => layer.id === "tomato") < layers.findIndex(layer => layer.id === "patty"));
      if (cheese !== "none") assert.ok(layers.findIndex(layer => layer.id === "cheese") > layers.findIndex(layer => layer.id === "patty"));
      signatures.add(JSON.stringify(layers));
    }
  }
  assert.equal(signatures.size, 576);
});

test("contact anchors let cheese drape while keeping the next bun on its upper surface", () => {
  const positioned = burgerPilotPlacements([
    { height: .3 },
    { height: .25 },
    { height: .2, config: { contactBottom: .16, contactTop: .2 } },
    { height: .45 },
  ]);
  assert.equal(positioned[0][1], 0);
  assert.equal(positioned[1][1], .3);
  assert.ok(Math.abs(positioned[2][1] - .39) < .000001);
  assert.ok(Math.abs(positioned[3][1] - .59) < .000001);
  const withoutCheese = burgerPilotPlacements([{ height: .3 }, { height: .25 }, { height: .45 }]);
  assert.ok(Math.abs(withoutCheese[2][1] - .55) < .000001);
});

test("pilot manifests accept partial asset production and reject invalid model transforms", () => {
  const manifest = { version: 1, itemId: "midnight-stack", ingredients: { patty: { url: "./patty.glb", width: 2.3, rotation: [0, 0, 0], overlap: .02 } } };
  assert.equal(validateBurgerPilotManifest(manifest), manifest);
  for (const invalid of [
    { url: "https://elsewhere.example/patty.glb", width: 2 },
    { url: "../patty.glb", width: 2 },
    { url: "./patty.glb", width: 0 },
    { url: "./patty.glb", width: 2, rotation: [0, 0] },
    { url: "./patty.glb", width: 2, overlap: NaN },
    { url: "./patty.glb", width: 2, contactBottom: .3, contactTop: .1 },
  ]) assert.throws(() => validateBurgerPilotManifest({ ...manifest, ingredients: { patty: invalid } }));
});
