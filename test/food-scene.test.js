import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import * as THREE from "three";
import { createFoodScene } from "../food-scene.js";
import { ITEMS } from "../catalog.js";
import { loadFoodLibrary } from "../scripts/model-library.js";

// Exercise the real scene lifecycle and Three.js transforms without a GPU.
// Only rendering, model downloads, DOM sizing, and the animation clock are stubbed.
test("the first ingredient entrance survives control-layout resize and slow first rendering", async () => {
  let now = 0, nextFrame = 0, resize, renderedScene, readyPose;
  let height = 400;
  const frames = new Map();
  const media = { matches: false, addEventListener() {}, removeEventListener() {} };
  const canvas = { style: {}, setAttribute() {}, addEventListener() {}, removeEventListener() {}, remove() {} };
  const container = { dataset: {}, append() {}, setAttribute() {}, getBoundingClientRect: () => ({ width: 500, height }) };
  const renderBoundary = {
    WebGLRenderer: class {
      constructor() { this.domElement = canvas; this.shadowMap = {}; this.capabilities = { getMaxAnisotropy: () => 1 }; }
      setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
      render(scene) { renderedScene = scene; now += 1400; }
    },
    PMREMGenerator: class { fromScene() { return { texture: new THREE.Texture(), dispose() {} }; } dispose() {} },
    GLTFLoader: class { async loadAsync() { return { scene: new THREE.Mesh(new THREE.BoxGeometry(1, .2, 1), new THREE.MeshStandardMaterial()) }; } },
    RoomEnvironment: class { dispose() {} },
  };
  const globals = {
    __foodSceneBoundary: renderBoundary,
    document: { baseURI: "https://test.invalid/" }, window: { devicePixelRatio: 1 },
    fetch: async () => ({ ok: true, json: async () => loadFoodLibrary() }),
    matchMedia: () => media, performance: { now: () => now },
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
    ResizeObserver: class { constructor(callback) { resize = callback; } observe() {} disconnect() {} },
  };
  const saved = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  const source = {
    "./vendor/three.module.js": `export * from ${JSON.stringify(import.meta.resolve("three"))}; export const { WebGLRenderer, PMREMGenerator } = globalThis.__foodSceneBoundary;`,
    "./vendor/GLTFLoader.js": "export const { GLTFLoader } = globalThis.__foodSceneBoundary;",
    "./vendor/RoomEnvironment.js": "export const { RoomEnvironment } = globalThis.__foodSceneBoundary;",
  };
  const hooks = registerHooks({ resolve(specifier, context, next) {
    if (context.parentURL?.endsWith("/food-scene.js") && source[specifier]) return { url: `data:text/javascript,${encodeURIComponent(source[specifier])}`, shortCircuit: true };
    return next(specifier, context);
  } });
  const tick = time => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); };
  const layers = () => renderedScene.children.find(node => node.isGroup).children;
  let scene;
  try {
    scene = await createFoodScene(container, { item: ITEMS[0], onState: state => {
      if (state.ready) readyPose = layers().map(layer => layer.position.y - layer.userData.restPosition.y);
    }, onFallback: error => { throw error; } });
    assert.ok(scene);
    assert.ok(readyPose.every(y => y >= .64), "arrival pose must be rendered before ready handoff");
    assert.equal(layers().filter(layer => layer.visible).length, 1, "only the first ingredient starts visible");
    const initial = layers().map(layer => layer.position.clone());
    tick(10000); // First frame can arrive long after models/shaders were prepared.
    assert.ok(layers().every((layer, i) => layer.position.equals(initial[i])), "slow initial rendering must not consume the entrance");
    tick(10299); // First contact: 65% of the 460 ms slot.
    assert.ok(Math.abs(layers()[0].position.y - layers()[0].userData.restPosition.y) < 1e-9);
    tick(10370); // Small upward rebound after contact.
    assert.ok(layers()[0].position.y > layers()[0].userData.restPosition.y);
    assert.ok(layers().slice(1).every(layer => !layer.visible), "later ingredients wait through the bounce");
    const midway = layers().map(layer => layer.position.clone());
    assert.ok(midway[0].y < initial[0].y && midway[0].y > layers()[0].userData.restPosition.y);
    height = 360; resize(); // Revealing the controls reduces the preview stage.
    assert.equal(frames.size, 1, "layout resize must not cancel the entrance frame");
    assert.ok(layers().every((layer, i) => layer.position.equals(midway[i])), "resize must preserve current ingredient poses");
    tick(10460);
    assert.ok(layers()[0].position.distanceTo(layers()[0].userData.restPosition) < 1e-9);
    assert.equal(layers()[1].visible, true, "the next ingredient appears only after the first settles");
    assert.ok(layers().slice(2).every(layer => !layer.visible));
    tick(10000 + layers().length * 460);
    assert.equal(frames.size, 0);
    assert.ok(layers().every(layer => layer.position.distanceTo(layer.userData.restPosition) < 1e-9));
    scene.assemble();
    assert.equal(frames.size, 1);
    scene.rotate(.2);
    assert.ok(layers().every(layer => layer.visible), "view controls reveal the finished dish when interrupting assembly");
    assert.ok(layers().every(layer => layer.position.distanceTo(layer.userData.restPosition) < 1e-9));
    scene.assemble();
    scene.dispose(); scene = null;
    assert.equal(frames.size, 0, "closing must cancel the remaining entrance");

    media.matches = true;
    scene = await createFoodScene(container, { item: ITEMS[0] });
    assert.ok(scene);
    assert.equal(frames.size, 0, "reduced motion must remain immediate");
    assert.ok(layers().every(layer => layer.position.distanceTo(layer.userData.restPosition) < 1e-9));
  } finally {
    scene?.dispose(); hooks.deregister();
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  }
});
