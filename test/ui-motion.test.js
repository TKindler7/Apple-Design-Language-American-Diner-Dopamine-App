import test from "node:test";
import assert from "node:assert/strict";

// A minimal DOM/RAF boundary: these tests exercise lifecycle and accessible data,
// not browser rendering, timing curves, layout, or a simulated screen reader.
class Element {
  constructor() {
    this.isConnected = true;
    this.children = [];
    this.attributes = new Map();
    const classes = new Set();
    this.classList = {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      contains: name => classes.has(name),
      toggle(name, force) {
        const enabled = force ?? !classes.has(name);
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
    };
    this.dataset = new Proxy({}, { set(object, key, value) { object[key] = String(value); return true; } });
    this.value = "";
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  set textContent(value) {
    this.children.forEach(child => { child.isConnected = false; });
    this.children = [];
    this.value = String(value);
  }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(""); }
  replaceChildren(...children) {
    this.textContent = "";
    this.children = children;
  }
  contains(element) { return this === element || this.children.some(child => child.contains(element)); }
}

const accessibleText = element => element.getAttribute("aria-hidden") === "true"
  ? "" : element.value + element.children.map(accessibleText).join("");
const visibleText = element => element.value + element.children.filter(child => child.className !== "sr-only").map(visibleText).join("");
const money = cents => `$${(cents / 100).toFixed(2)}`;
let fixtureId = 0;

async function fixture(t) {
  const frames = new Map();
  const mediaListeners = [];
  const visibilityListeners = [];
  let now = 0, nextFrame = 0;
  const media = { matches: false, addEventListener: (type, callback) => mediaListeners.push(callback) };
  const document = {
    hidden: false,
    documentElement: new Element(),
    createElement: () => new Element(),
    addEventListener: (type, callback) => { if (type === "visibilitychange") visibilityListeners.push(callback); },
  };
  const globals = {
    document,
    matchMedia: () => media,
    performance: { now: () => now },
    requestAnimationFrame: callback => { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  for (const [name, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => { if (original) Object.defineProperty(globalThis, name, original); else delete globalThis[name]; });
  }
  const motion = await import(`../ui-motion.js?lifecycle-test=${++fixtureId}`);
  return {
    ...motion,
    pending: () => frames.size,
    step(timestamp) {
      now = timestamp;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(callback => callback(now));
    },
    reduce() { media.matches = true; mediaListeners.forEach(callback => callback()); },
    hide() { document.hidden = true; visibilityListeners.forEach(callback => callback()); },
  };
}

test("amount animation exposes the final accessible amount immediately and settles exactly", async t => {
  const motion = await fixture(t);
  const amount = new Element();
  motion.animateAmount(amount, 1000, 1450, money);
  assert.equal(amount.dataset.value, "1450");
  assert.equal(accessibleText(amount), "$14.50");
  assert.equal(motion.pending(), 1);
  motion.step(100);
  assert.equal(accessibleText(amount), "$14.50", "intermediate visuals must not change the accessible price");
  motion.step(1000);
  assert.equal(visibleText(amount), "$14.50");
  assert.equal(accessibleText(amount), "$14.50");
  assert.equal(motion.pending(), 0);
});

test("reduced motion displays the exact target without scheduling animation", async t => {
  const motion = await fixture(t);
  motion.reduce();
  const amount = new Element();
  motion.animateAmount(amount, 0, 2275, money);
  assert.equal(amount.dataset.value, "2275");
  assert.equal(accessibleText(amount), "$22.75");
  assert.equal(visibleText(amount), "$22.75");
  assert.equal(motion.pending(), 0);
});

test("hiding the page cancels pending amounts at their final values", async t => {
  const motion = await fixture(t);
  const amount = new Element();
  motion.animateAmount(amount, 0, 1700, money);
  motion.step(50);
  motion.hide();
  assert.equal(visibleText(amount), "$17.00");
  assert.equal(accessibleText(amount), "$17.00");
  assert.equal(motion.pending(), 0);
});

test("enabling reduced motion during an animation cancels its remaining work", async t => {
  const motion = await fixture(t);
  const amount = new Element();
  motion.animateAmount(amount, 100, 2, String);
  motion.step(50);
  motion.reduce();
  assert.equal(visibleText(amount), "2");
  assert.equal(accessibleText(amount), "2");
  assert.equal(motion.pending(), 0);
});

test("a rapid amount update cancels the old target so it cannot overwrite the new one", async t => {
  const motion = await fixture(t);
  const amount = new Element();
  motion.animateAmount(amount, 1000, 2000, money);
  motion.step(50);
  motion.animateAmount(amount, 2000, 750, money);
  assert.equal(amount.dataset.value, "750");
  assert.equal(accessibleText(amount), "$7.50");
  assert.equal(motion.pending(), 1);
  motion.step(1000);
  assert.equal(visibleText(amount), "$7.50");
  assert.equal(motion.pending(), 0);
});

test("leaving a dialog settles its own amounts without canceling another region", async t => {
  const motion = await fixture(t);
  const dialog = new Element(), inside = new Element(), outside = new Element();
  dialog.replaceChildren(inside);
  motion.animateAmount(inside, 0, 2300, money);
  motion.animateAmount(outside, 0, 800, money);
  motion.stopMotionWithin(dialog);
  assert.equal(visibleText(inside), "$23.00");
  assert.equal(accessibleText(inside), "$23.00");
  assert.equal(motion.pending(), 1);
  motion.step(1000);
  assert.equal(visibleText(outside), "$8.00");
  assert.equal(motion.pending(), 0);
});

test("a disconnected amount releases its frame and cancellation listener state", async t => {
  const motion = await fixture(t);
  const amount = new Element();
  motion.animateAmount(amount, 0, 1500, money);
  amount.isConnected = false;
  motion.step(50);
  assert.equal(motion.pending(), 0);
  assert.equal(visibleText(amount), "$15.00");
  const visual = amount.children.find(child => child.getAttribute("aria-hidden") === "true");
  visual.textContent = "detached";
  motion.reduce();
  assert.equal(visual.textContent, "detached", "settled detached nodes must no longer receive cancellation writes");
});

test("an unsupported Web Animation cannot block the caller's immediate fallback", async t => {
  const motion = await fixture(t);
  const element = new Element();
  element.animate = () => { throw new Error("Animation unsupported"); };
  assert.equal(motion.animateUI(element, [{ opacity: 0 }, { opacity: 1 }]), null);
});
