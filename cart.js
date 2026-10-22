export const STORAGE_KEY = "good-hour-cart-v1";
const LEGACY_STORAGE_KEY = "pennyglass-cart-v1";

export const MENU = Object.freeze({
  "midnight-stack": { name: "The Midnight Stack", price: 14, image: "./assets/burger.svg" },
  "sunrise-flapjacks": { name: "Sunrise Flapjacks", price: 11, image: "./assets/pancakes.svg" },
  "cherry-cloud-shake": { name: "Cherry Cloud Shake", price: 8, image: "./assets/shake.svg" },
});

export function normalizeCart(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const cart = {};
  for (const [id, quantity] of Object.entries(value)) {
    if (Object.hasOwn(MENU, id) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99) {
      cart[id] = quantity;
    }
  }
  return cart;
}

export function loadCart(storage) {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved !== null) return normalizeCart(JSON.parse(saved));
    const previous = storage.getItem(LEGACY_STORAGE_KEY);
    if (previous === null) return {};
    const cart = normalizeCart(JSON.parse(previous));
    saveCart(storage, cart);
    return cart;
  } catch {
    return {};
  }
}

export function saveCart(storage, cart) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeCart(cart)));
    return true;
  } catch {
    return false;
  }
}

export function setQuantity(cart, id, quantity) {
  if (!Object.hasOwn(MENU, id)) return cart;
  const next = { ...normalizeCart(cart) };
  if (quantity <= 0) delete next[id];
  else next[id] = Math.min(99, Math.floor(quantity));
  return next;
}

export function countItems(cart) {
  return Object.values(normalizeCart(cart)).reduce((sum, quantity) => sum + quantity, 0);
}

export function totalPrice(cart) {
  return Object.entries(normalizeCart(cart)).reduce((sum, [id, quantity]) => sum + MENU[id].price * quantity, 0);
}
