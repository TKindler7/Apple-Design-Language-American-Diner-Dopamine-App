import test from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY, countItems, loadCart, normalizeCart, saveCart, setQuantity, totalPrice } from "../cart.js";

function storage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  };
}

test("adding two diner items survives a reload with the right total", () => {
  const browserStorage = storage();
  let cart = setQuantity({}, "midnight-stack", 1);
  cart = setQuantity(cart, "sunrise-flapjacks", 1);
  assert.equal(saveCart(browserStorage, cart), true);

  const reloadedCart = loadCart(browserStorage);
  assert.deepEqual(reloadedCart, cart);
  assert.equal(countItems(reloadedCart), 2);
  assert.equal(totalPrice(reloadedCart), 25);
});

test("removing an item updates the saved cart and total", () => {
  const browserStorage = storage();
  const cart = setQuantity({ "midnight-stack": 1, "cherry-cloud-shake": 1 }, "midnight-stack", 0);
  saveCart(browserStorage, cart);
  assert.deepEqual(loadCart(browserStorage), { "cherry-cloud-shake": 1 });
  assert.equal(totalPrice(cart), 8);
});

test("damaged or outdated saved data cannot add unknown items", () => {
  const browserStorage = storage();
  browserStorage.setItem(STORAGE_KEY, "not json");
  assert.deepEqual(loadCart(browserStorage), {});
  browserStorage.setItem(STORAGE_KEY, JSON.stringify({ "midnight-stack": 2, unknown: 999, "sunrise-flapjacks": -1 }));
  assert.deepEqual(loadCart(browserStorage), { "midnight-stack": 2 });
  assert.deepEqual(normalizeCart(["midnight-stack"]), {});
});
