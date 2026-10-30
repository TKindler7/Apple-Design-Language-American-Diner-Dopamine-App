import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Run the actual DOM presentation function with a small DOM boundary, avoiding
// the unrelated cart/menu startup and any claim of browser rendering coverage.
const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const presentation = app.slice(app.indexOf("function setPreview(mode) {"), app.indexOf("async function startBuilderScene()"));

test("3D opens without a photo flash, while explicit photos and failure fallback still work", () => {
  const elements = new Map();
  const node = selector => {
    if (!elements.has(selector)) elements.set(selector, { style: {}, hidden: false, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } });
    return elements.get(selector);
  };
  const buttons = ["3d", "photo"].map(mode => ({ ...node(mode), dataset: { preview: mode } }));
  const context = vm.createContext({
    $: node, all: () => buttons, draft: {}, scene: null,
    previewMode: "3d", previewReady: false, previewFailed: false, previewLoading: true,
  });
  const show = mode => vm.runInContext(`${presentation}\nsetPreview(${JSON.stringify(mode)});`, context);
  show("3d");
  assert.equal(node("#builder-photo").hidden, true);
  assert.equal(node("#preview-loading").hidden, false);
  assert.equal(node("#preview-controls").hidden, true);
  assert.equal(buttons[0].attributes["aria-pressed"], "true");
  assert.match(node("#preview-caption").textContent, /Preparing your 3D ingredients/);
  context.scene = {}; context.previewReady = true; context.previewLoading = false;
  show("3d");
  assert.equal(node("#builder-photo").hidden, true);
  assert.equal(node("#food-scene").attributes["aria-hidden"], "false");
  assert.equal(node("#preview-controls").hidden, false);
  show("photo");
  assert.equal(node("#builder-photo").hidden, false);
  assert.equal(node("#food-scene canvas").tabIndex, -1);
  context.previewReady = false; context.previewFailed = true;
  show("3d");
  assert.equal(node("#builder-photo").hidden, false);
  assert.equal(node("#preview-loading").hidden, true);
  assert.match(node("#preview-caption").textContent, /unavailable/);
});
