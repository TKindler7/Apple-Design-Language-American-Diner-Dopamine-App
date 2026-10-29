import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, ITEMS, ITEM_BY_ID, defaultOptions, itemPrice, normalizeOptions, optionSummary } from "../catalog.js";
import {
  STORAGE_KEY, COMBO_DISCOUNT, SPECIAL_DISCOUNT, addLine, cartCount, cartTotal,
  completeOrder, createLine, emptyState, lineSummary, lineUnitPrice, loadState,
  normalizeCart, normalizeLine, normalizeState, saveState, savingsTotal, setLineQuantity,
} from "../cart.js";

function storage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}

const when = "2026-10-27T20:00:00.000Z";
const meal = { sideId: "golden-fries", drinkId: "cherry-cloud-shake" };

test("catalog has 23 unique original items in the five required category counts", () => {
  assert.equal(ITEMS.length, 23);
  assert.equal(new Set(ITEMS.map((item) => item.id)).size, 23);
  assert.deepEqual(CATEGORIES.map(({ id }) => ITEMS.filter((item) => item.category === id).length), [6, 4, 4, 5, 4]);
  for (const item of ITEMS) {
    assert.equal(ITEM_BY_ID[item.id], item);
    assert.ok(item.name && item.description && item.model);
    assert.ok(Number.isSafeInteger(item.price) && item.price > 0);
    assert.equal(item.image, `./assets/food/${item.id}.webp`);
    assert.equal(itemPrice(item.id, defaultOptions(item.id)), item.price, `${item.name} includes its defaults`);
  }
  assert.equal(ITEM_BY_ID["midnight-stack"].price, 1400);
  assert.equal(ITEM_BY_ID["sunrise-flapjacks"].price, 1100);
  assert.equal(ITEM_BY_ID["cherry-cloud-shake"].price, 800);
});

test("option validation retains deliberate removals and rejects unknown or duplicate charges", () => {
  const options = normalizeOptions("midnight-stack", { cheese: "invented", toppings: ["bacon", "bacon", "unknown"], sauce: "none", hackedPrice: -999 });
  assert.deepEqual(options, { cheese: "cheddar", toppings: ["bacon"], sauce: "none" });
  assert.equal(itemPrice("midnight-stack", options), 1600);
  assert.deepEqual(normalizeOptions("midnight-stack", { cheese: "none", toppings: [] }).toppings, []);
  assert.ok(optionSummary("midnight-stack", { cheese: "none", toppings: [] }).includes("Toppings: None"));
  assert.ok(optionSummary("midnight-stack", { cheese: "none", toppings: [] }).includes("Cheese: No cheese"));
  assert.equal(itemPrice("__proto__", {}), 0);
  assert.deepEqual(defaultOptions("unknown"), {});
});

test("item choices and portion upgrades calculate exact integer-cent prices", () => {
  assert.equal(itemPrice("midnight-stack", { toppings: ["bacon", "extra-patty"] }), 2000);
  assert.equal(itemPrice("sunrise-flapjacks", { stack: "tall", toppings: ["blueberry", "chocolate"] }), 1650);
  assert.equal(itemPrice("cherry-cloud-shake", { size: "large", toppings: [] }), 1000);
  assert.equal(itemPrice("strawberry-soda", { size: "large", ice: "none" }), 650);
});

test("meal pricing combines entrée choices, regular side and drink, combo discount and locked special", () => {
  const line = createLine("midnight-stack", { toppings: ["bacon"] }, meal, true);
  assert.equal(COMBO_DISCOUNT, 300);
  assert.equal(SPECIAL_DISCOUNT, 200);
  assert.equal(lineUnitPrice(line), 1600 + 500 + 800 - 300 - 200);
  assert.equal(cartTotal([{ ...line, quantity: 2 }]), 4800);
  assert.ok(lineSummary(line).some((text) => text.includes("Golden Fries + Cherry Cloud Shake")));
  assert.ok(lineSummary(line).includes("Fictional special: $2 off"));
});

test("invalid combo categories and special eligibility cannot alter pricing", () => {
  const line = createLine("sunrise-flapjacks", {}, { sideId: "midnight-stack", drinkId: "cherry-cloud-shake" }, true);
  assert.equal(line.combo, null);
  assert.equal(line.special, false);
  assert.equal(lineUnitPrice(line), 1100);
  assert.equal(createLine("cherry-cloud-shake", {}, meal).combo, null);
  assert.equal(createLine("unknown"), null);
});

test("matching configurations merge while different customizations and offers remain distinct", () => {
  const first = createLine("midnight-stack", { toppings: ["lettuce", "bacon"] });
  let cart = addLine([], first);
  cart = addLine(cart, createLine("midnight-stack", { toppings: ["bacon", "lettuce"] }));
  cart = addLine(cart, createLine("midnight-stack", { cheese: "none", toppings: ["bacon", "lettuce"] }));
  cart = addLine(cart, createLine("midnight-stack", { toppings: ["bacon", "lettuce"] }, null, true));
  assert.equal(cart.length, 3);
  assert.equal(cart[0].quantity, 2);
  assert.equal(cart[0].id, first.id);
  assert.equal(cartCount(cart), 4);
  assert.equal(first.quantity, 1);
});

test("quantity updates remove the intended line and enforce safe bounds", () => {
  const first = createLine("midnight-stack");
  const second = createLine("sunrise-flapjacks");
  const cart = [first, second];
  assert.deepEqual(setLineQuantity(cart, first.id, 0), [second]);
  assert.equal(setLineQuantity(cart, first.id, 300)[0].quantity, 99);
  assert.equal(setLineQuantity(cart, first.id, 2.9)[0].quantity, 2);
  assert.deepEqual(setLineQuantity(cart, first.id, NaN), cart);
  assert.equal(normalizeLine({ ...first, quantity: -1 }), null);
  assert.equal(normalizeLine({ ...first, quantity: "2" }), null);
  assert.equal(normalizeLine({ ...first, quantity: 100 }), null);
  assert.deepEqual(normalizeCart({ "midnight-stack": 1 }), []);
});

test("saved cart, meal draft, history and sound preference survive reload together", () => {
  const browserStorage = storage();
  let state = { ...emptyState(), sound: true, visited: true, draft: { itemId: "midnight-stack", options: { cheese: "swiss", toppings: [] }, combo: meal, special: true } };
  state.cart = addLine(state.cart, createLine("sunrise-flapjacks", { stack: "tall" }));
  state = completeOrder(state, { id: "order-first", createdAt: when }).state;
  state.cart = addLine(state.cart, createLine("midnight-stack", { toppings: ["bacon"] }, meal));
  assert.equal(saveState(browserStorage, state), true);
  const restored = loadState(browserStorage);
  assert.deepEqual(restored, normalizeState(state));
  assert.equal(restored.sound, true);
  assert.equal(restored.draft.options.cheese, "swiss");
  assert.deepEqual(restored.draft.options.toppings, []);
  assert.equal(savingsTotal(restored), 1400);
  assert.equal(cartTotal(restored.cart), 2600);
});

for (const key of ["good-hour-cart-v1", "pennyglass-cart-v1"]) {
  test(`${key} migrates without losing the original items or inventing offers`, () => {
    const browserStorage = storage({ [key]: JSON.stringify({ "midnight-stack": 2, "sunrise-flapjacks": 1, "cherry-cloud-shake": 1, unknown: 10, "golden-fries": 9 }) });
    const state = loadState(browserStorage);
    assert.equal(cartCount(state.cart), 4);
    assert.equal(cartTotal(state.cart), 4700);
    assert.equal(state.cart.every((line) => line.special === false && line.combo === null), true);
    assert.ok(browserStorage.getItem(STORAGE_KEY));
    saveState(browserStorage, emptyState());
    assert.equal(loadState(browserStorage).cart.length, 0, "a cleared v2 cart never resurrects legacy items");
  });
}

test("damaged state and unavailable storage fail safely, with legacy recovery where possible", () => {
  const browserStorage = storage({ [STORAGE_KEY]: "not json", "good-hour-cart-v1": "broken", "pennyglass-cart-v1": JSON.stringify({ "midnight-stack": 1 }) });
  assert.equal(cartTotal(loadState(browserStorage).cart), 1400);
  const denied = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("full"); } };
  assert.deepEqual(loadState(denied), emptyState());
  assert.equal(saveState(denied, emptyState()), false);
  assert.deepEqual(normalizeState({ version: 99, cart: [createLine("midnight-stack")] }), emptyState());
  assert.equal(normalizeState({ ...emptyState(), sound: "true", draft: { itemId: "unknown" } }).sound, false);
});

test("checkout records one immutable-priced order and cannot duplicate on reload or repeated submission", () => {
  const initial = { ...emptyState(), cart: [createLine("midnight-stack", {}, meal, true)] };
  const result = completeOrder(initial, { id: "order-fixed", createdAt: when });
  assert.equal(result.order.total, 2200);
  assert.equal(result.order.lines[0].unitPrice, 2200);
  assert.equal(result.state.cart.length, 0);
  assert.equal(initial.cart.length, 1);
  const afterReload = normalizeState(JSON.parse(JSON.stringify(result.state)));
  const repeat = completeOrder(afterReload, { id: "order-fixed", createdAt: when });
  assert.equal(repeat.state.orders.length, 1);
  assert.equal(savingsTotal(repeat.state), 2200);
  assert.equal(completeOrder(repeat.state, { id: "order-another", createdAt: when }).order, null);
  afterReload.cart = [createLine("vanilla-malt")];
  const replayWithNewCart = completeOrder(afterReload, { id: "order-fixed", createdAt: when });
  assert.equal(replayWithNewCart.state.cart.length, 1, "replaying a completed order must not clear a new cart");
});

test("historical receipts preserve snapshots and repair inconsistent totals without double counting duplicate IDs", () => {
  const line = { ...createLine("midnight-stack"), quantity: 2, unitPrice: 1375 };
  const history = { id: "order-snapshot", createdAt: when, lines: [line], total: 999999 };
  const restored = normalizeState({ ...emptyState(), orders: [history, history, { ...history, id: "bad date", createdAt: "invalid" }] });
  assert.equal(restored.orders.length, 1);
  assert.equal(restored.orders[0].lines[0].unitPrice, 1375);
  assert.equal(restored.orders[0].total, 2750);
  assert.equal(savingsTotal(restored), 2750);
  assert.equal(savingsTotal(restored.orders), 2750);
  const repaired = normalizeState({ ...emptyState(), orders: [{ ...history, lines: [{ ...line, unitPrice: -999 }] }] });
  assert.equal(repaired.orders[0].total, 2800);
});

test("saved cart validation repairs duplicate row IDs without dropping valid distinct meals", () => {
  const first = { ...createLine("midnight-stack"), id: "same-id" };
  const second = { ...createLine("sunrise-flapjacks"), id: "same-id" };
  const state = normalizeState({ ...emptyState(), cart: [first, second, { ...first, itemId: "__proto__" }, { ...first, quantity: 0 }] });
  assert.equal(state.cart.length, 2);
  assert.equal(new Set(state.cart.map((line) => line.id)).size, 2);
  assert.equal(cartTotal(state.cart), 2500);
});
