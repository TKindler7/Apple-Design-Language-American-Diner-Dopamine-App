import { mkdirSync, writeFileSync } from "node:fs";
import { ITEMS, defaultOptions } from "../catalog.js";
import { foodRecipe, foodPlacements } from "../food-model.js";
import { loadFoodLibrary } from "./model-library.js";

const manifest = loadFoodLibrary();
const dishes = ITEMS.flatMap(item => {
  const variants = {
    default: defaultOptions(item.id),
    minimal: Object.fromEntries(item.options.map(group => [group.id, group.type === "multiple" ? [] : (group.choices.find(choice => choice.id === "none") ?? group.choices[0]).id])),
    loaded: Object.fromEntries(item.options.map(group => [group.id, group.type === "multiple" ? group.choices.map(choice => choice.id) : (group.choices.find(choice => ["large", "tall", "three", "scrambled", "sausage", "chocolate", "swiss", "smoky", "sourdough"].includes(choice.id)) ?? group.choices[0]).id])),
  };
  return Object.entries(variants).map(([variant, options]) => ({ id: item.id, name: item.name, category: item.category, variant, options, layers: foodPlacements(foodRecipe(item, options), manifest) }));
});
mkdirSync(new URL("../.local-ai", import.meta.url), { recursive: true });
writeFileSync(new URL("../.local-ai/menu-review.json", import.meta.url), JSON.stringify({ manifest, dishes }, null, 2));
console.log(`Prepared ${dishes.length} review configurations using the app's exact recipe placements.`);
