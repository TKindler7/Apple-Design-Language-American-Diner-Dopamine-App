import { ITEM_BY_ID, defaultOptions, itemPrice, normalizeOptions, optionSummary } from "./catalog.js";

export const STORAGE_KEY = "good-hour-state-v2";
export const COMBO_DISCOUNT = 300;
export const SPECIAL_DISCOUNT = 200;
const LEGACY_KEYS = ["good-hour-cart-v1", "pennyglass-cart-v1"];
const LEGACY_ITEMS = new Set(["midnight-stack", "sunrise-flapjacks", "cherry-cloud-shake"]);
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const knownItem = (id) => typeof id === "string" && Object.hasOwn(ITEM_BY_ID, id);
const validId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(id);
const validQuantity = (quantity) => Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 99;

function makeId(prefix) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`}`;
}

function configKey(line) {
  return JSON.stringify([line.itemId, line.options, line.combo, line.special]);
}

function stableLineId(line) {
  let hash = 2166136261;
  for (const character of configKey(line)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `line-${(hash >>> 0).toString(36)}`;
}

function normalizeCombo(itemId, value) {
  const entree = ITEM_BY_ID[itemId];
  if (!entree || !["burgers", "breakfast"].includes(entree.category) || !isRecord(value)) return null;
  if (!knownItem(value.sideId) || ITEM_BY_ID[value.sideId].category !== "sides") return null;
  if (!knownItem(value.drinkId) || ITEM_BY_ID[value.drinkId].category !== "drinks") return null;
  return { sideId: value.sideId, drinkId: value.drinkId };
}

export function normalizeLine(value) {
  if (!isRecord(value) || !knownItem(value.itemId) || !validQuantity(value.quantity)) return null;
  const line = {
    id: value.id,
    itemId: value.itemId,
    options: normalizeOptions(value.itemId, value.options),
    quantity: value.quantity,
    combo: normalizeCombo(value.itemId, value.combo),
    special: value.itemId === "midnight-stack" && value.special === true,
  };
  if (!validId(line.id)) line.id = stableLineId(line);
  return line;
}

export function createLine(itemId, options = {}, combo = null, special = false) {
  return normalizeLine({ id: makeId("line"), itemId, options, quantity: 1, combo, special });
}

export function normalizeCart(value) {
  if (!Array.isArray(value)) return [];
  const cart = [];
  const configurations = new Map();
  const ids = new Set();
  for (const candidate of value) {
    const line = normalizeLine(candidate);
    if (!line) continue;
    const key = configKey(line);
    const existing = configurations.get(key);
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + line.quantity);
      continue;
    }
    if (ids.has(line.id)) {
      const base = stableLineId(line);
      line.id = base;
      let suffix = 1;
      while (ids.has(line.id)) line.id = `${base}-${suffix++}`;
    }
    ids.add(line.id);
    configurations.set(key, line);
    cart.push(line);
  }
  return cart;
}

export function lineUnitPrice(value) {
  const line = normalizeLine(value);
  if (!line) return 0;
  const comboPrice = line.combo
    ? itemPrice(line.combo.sideId, defaultOptions(line.combo.sideId)) + itemPrice(line.combo.drinkId, defaultOptions(line.combo.drinkId)) - COMBO_DISCOUNT
    : 0;
  return Math.max(0, itemPrice(line.itemId, line.options) + comboPrice - (line.special ? SPECIAL_DISCOUNT : 0));
}

export function lineSummary(value) {
  const line = normalizeLine(value);
  if (!line) return [];
  const summary = optionSummary(line.itemId, line.options);
  if (line.combo) summary.push(`Meal: ${ITEM_BY_ID[line.combo.sideId].name} + ${ITEM_BY_ID[line.combo.drinkId].name} (regular)`);
  if (line.special) summary.push("Fictional special: $2 off");
  return summary;
}

export function addLine(cart, value) {
  const normalized = normalizeCart(cart);
  const line = normalizeLine(value);
  return line ? normalizeCart([...normalized, line]) : normalized;
}

export function setLineQuantity(cart, lineId, quantity) {
  const normalized = normalizeCart(cart);
  if (!Number.isFinite(quantity)) return normalized;
  if (quantity <= 0) return normalized.filter((line) => line.id !== lineId);
  const nextQuantity = Math.min(99, Math.max(1, Math.floor(quantity)));
  return normalized.map((line) => line.id === lineId ? { ...line, quantity: nextQuantity } : line);
}

export function cartCount(cart) {
  return normalizeCart(cart).reduce((sum, line) => sum + line.quantity, 0);
}

export function cartTotal(cart) {
  return normalizeCart(cart).reduce((sum, line) => sum + lineUnitPrice(line) * line.quantity, 0);
}

export function emptyState() {
  return { version: 2, cart: [], orders: [], draft: null, sound: false, visited: false };
}

export function normalizeDraft(value) {
  if (!isRecord(value) || !knownItem(value.itemId)) return null;
  return {
    itemId: value.itemId,
    options: normalizeOptions(value.itemId, value.options),
    combo: normalizeCombo(value.itemId, value.combo),
    special: value.itemId === "midnight-stack" && value.special === true,
  };
}

// Completed orders retain their original per-unit prices, even if the catalog changes later.
function normalizeOrderLines(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  const lines = [];
  for (const candidate of value) {
    const line = normalizeLine(candidate);
    if (!line) continue;
    if (ids.has(line.id)) line.id = `${stableLineId(line)}-${lines.length}`;
    ids.add(line.id);
    const price = candidate.unitPrice;
    line.unitPrice = Number.isSafeInteger(price) && price >= 0 && price <= 100000 ? price : lineUnitPrice(line);
    lines.push(line);
  }
  return lines;
}

function normalizeOrders(value) {
  if (!Array.isArray(value)) return [];
  const orders = [];
  const ids = new Set();
  for (const candidate of value) {
    if (!isRecord(candidate) || !validId(candidate.id) || ids.has(candidate.id)) continue;
    if (typeof candidate.createdAt !== "string" || !Number.isFinite(Date.parse(candidate.createdAt))) continue;
    const lines = normalizeOrderLines(candidate.lines);
    if (!lines.length) continue;
    ids.add(candidate.id);
    orders.push({
      id: candidate.id,
      createdAt: new Date(candidate.createdAt).toISOString(),
      lines,
      total: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    });
  }
  return orders;
}

export function normalizeState(value) {
  if (!isRecord(value) || value.version !== 2) return emptyState();
  return {
    version: 2,
    cart: normalizeCart(value.cart),
    orders: normalizeOrders(value.orders),
    draft: normalizeDraft(value.draft),
    sound: value.sound === true,
    visited: value.visited === true,
  };
}

export function saveState(storage, value) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(value)));
    return true;
  } catch {
    return false;
  }
}

export function loadState(storage) {
  let saved;
  try { saved = storage.getItem(STORAGE_KEY); } catch { return emptyState(); }
  if (saved !== null) {
    try {
      const parsed = JSON.parse(saved);
      if (isRecord(parsed) && parsed.version === 2) return normalizeState(parsed);
    } catch { /* Try the prior cart keys if the new state is unreadable. */ }
  }
  for (const key of LEGACY_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      const previous = JSON.parse(raw);
      if (!isRecord(previous)) continue;
      const state = emptyState();
      state.cart = Object.entries(previous)
        .filter(([itemId, quantity]) => LEGACY_ITEMS.has(itemId) && validQuantity(quantity))
        .map(([itemId, quantity]) => normalizeLine({ id: `legacy-${itemId}`, itemId, quantity, options: defaultOptions(itemId), combo: null, special: false }));
      state.visited = true;
      saveState(storage, state);
      return state;
    } catch { /* A damaged older key must not stop recovery from another key. */ }
  }
  return emptyState();
}

export function completeOrder(value, details = {}) {
  const state = normalizeState(value);
  const id = validId(details.id) ? details.id : makeId("order");
  const existing = state.orders.find((order) => order.id === id);
  if (existing) return { state, order: existing };
  if (!state.cart.length) return { state, order: null };
  const createdAt = typeof details.createdAt === "string" && Number.isFinite(Date.parse(details.createdAt))
    ? new Date(details.createdAt).toISOString()
    : new Date().toISOString();
  const lines = state.cart.map((line) => ({ ...line, options: normalizeOptions(line.itemId, line.options), combo: line.combo ? { ...line.combo } : null, unitPrice: lineUnitPrice(line) }));
  const order = { id, createdAt, lines, total: cartTotal(state.cart) };
  return { state: { ...state, cart: [], orders: [order, ...state.orders], visited: true }, order };
}

export function savingsTotal(value) {
  const orders = Array.isArray(value) ? normalizeOrders(value) : normalizeState(value).orders;
  return orders.reduce((sum, order) => sum + order.total, 0);
}
