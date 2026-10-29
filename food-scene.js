// Original procedural diner models. Geometry is generated here; no external models or textures.
export async function createFoodScene(container, { item, options = {}, reducedMotion = false, onFallback = () => {} } = {}) {
  if (!container || !item) return null;
  const resources = [];
  const addCleanup = release => resources.push(release);
  function cleanup() {
    // Continue releasing the other resources even if a browser API fails during cleanup.
    for (const release of resources.splice(0).reverse()) {
      try { release(); } catch { /* The photograph remains available. */ }
    }
  }
  try {
    const THREE = await import("./vendor/three.module.js");
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    addCleanup(() => renderer.forceContextLoss());
    addCleanup(() => renderer.dispose());
    return initializeFoodScene(THREE, renderer, container, { item, options, reducedMotion, onFallback }, addCleanup, cleanup);
  } catch {
    cleanup();
    onFallback();
    return null;
  }
}

function initializeFoodScene(THREE, renderer, container, { item, options, reducedMotion, onFallback }, addCleanup, cleanup) {
  const canvas = renderer.domElement;
  addCleanup(() => canvas.remove());
  canvas.className = "food-scene-canvas";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", `${item.name}, interactive three-dimensional preview. Drag to rotate. Use arrow keys to rotate or zoom.`);
  canvas.tabIndex = 0;
  Object.assign(canvas.style, { display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "grab" });
  container.append(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  addCleanup(() => scene.traverse(object => { object.geometry?.dispose(); object.shadow?.dispose(); }));
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  const turntable = new THREE.Group();
  scene.add(turntable);
  scene.add(new THREE.HemisphereLight(0xfff5e6, 0x7d6554, 2.6));
  const keyLight = new THREE.DirectionalLight(0xfff5e8, 3.8);
  keyLight.position.set(-3, 6, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -3.8, right: 3.8, top: 4.5, bottom: -3.8, near: 0.5, far: 15 });
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 3;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xe4edff, 1.5);
  fillLight.position.set(4, 2.5, -2);
  scene.add(fillLight);

  const materialCache = new Map();
  const textures = new Map();
  addCleanup(() => { for (const mat of materialCache.values()) mat.dispose(); });
  addCleanup(() => { for (const map of textures.values()) map.dispose(); });
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = reducedMotion || motionQuery.matches;
  let disposed = false;
  let failed = false;
  let food = null;
  let layers = [];
  let frame = 0;
  addCleanup(() => cancelAnimationFrame(frame));
  const departures = new Set();
  const viewTweens = new Map();
  addCleanup(() => clearDepartures());
  let distance = 6.5;
  let elevation = 0.42;
  let targetHeight = 1.0;
  let viewHeight = targetHeight;
  let modelKey = "";
  let configurationKey = "";
  const pointers = new Map();
  let pinchDistance = 0;

  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const rng = (seed = 8) => () => ((seed = Math.imul(1664525, seed) + 1013904223 | 0) >>> 0) / 4294967296;

  function texture(kind) {
    if (textures.has(kind)) return textures.get(kind);
    const surface = document.createElement("canvas");
    surface.width = surface.height = 256;
    const ctx = surface.getContext("2d");
    const random = rng(kind.length * 391);
    const bases = { bun: "#ca823b", patty: "#593322", pancake: "#ca8849", toast: "#c58b50", crumb: "#c88b44", potato: "#e8b657" };
    ctx.fillStyle = bases[kind] || "#c58b50";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4200; i++) {
      const value = random();
      ctx.fillStyle = value > 0.5 ? `rgba(255,234,192,${random() * 0.2})` : `rgba(48,19,5,${random() * 0.28})`;
      ctx.beginPath();
      ctx.ellipse(random() * 256, random() * 256, 0.3 + random() * 2.8, 0.3 + random() * 1.9, random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    if (kind === "pancake" || kind === "toast" || kind === "bun") {
      for (let i = 0; i < 20; i++) {
        const x = random() * 256, y = random() * 256, r = 12 + random() * 45;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, "rgba(112,51,17,.2)");
        gradient.addColorStop(1, "rgba(112,51,17,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    const result = new THREE.CanvasTexture(surface);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.set(kind, result);
    return result;
  }

  function material(color, roughness = 0.55, kind = "") {
    const key = `${color}|${roughness}|${kind}`;
    if (!materialCache.has(key)) {
      materialCache.set(key, new THREE.MeshStandardMaterial({
        color, roughness, metalness: 0,
        ...(kind ? { map: texture(kind), bumpMap: texture(kind), bumpScale: kind === "patty" ? 0.075 : 0.018 } : {}),
      }));
    }
    return materialCache.get(key);
  }
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xf0f6f4, transparent: true, opacity: 0.23, roughness: 0.08, metalness: 0, transmission: 0.18, thickness: 0.12, ior: 1.45, depthWrite: false });
  materialCache.set("glass", glass);
  const plateMaterial = material(0xf5eee1, 0.23);
  const plate = new THREE.Mesh(new THREE.LatheGeometry([
    new THREE.Vector2(0, 0.035), new THREE.Vector2(0.6, 0.035), new THREE.Vector2(1.15, 0.06),
    new THREE.Vector2(1.48, 0.12), new THREE.Vector2(1.65, 0.21), new THREE.Vector2(1.67, 0.24),
    new THREE.Vector2(1.62, 0.27), new THREE.Vector2(1.42, 0.21), new THREE.Vector2(1.1, 0.14), new THREE.Vector2(0, 0.14),
  ], 64), plateMaterial);
  plate.receiveShadow = true;
  plate.castShadow = true;
  turntable.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.57, 0.012, 8, 80), material(0x9b8d79, 0.28));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.238;
  turntable.add(rim);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ color: 0x493a29, opacity: 0.17 }));
  addCleanup(() => shadow.material.dispose());
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  shadow.receiveShadow = true;
  scene.add(shadow);

  function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
    const result = new THREE.Mesh(geometry, mat);
    result.position.set(x, y, z);
    result.castShadow = result.receiveShadow = true;
    parent.add(result);
    return result;
  }
  function sphere(parent, x, y, z, radius, color, scale = [1, 1, 1], roughness = 0.5) {
    const result = mesh(new THREE.SphereGeometry(radius, 24, 16), material(color, roughness), parent, x, y, z);
    result.scale.set(...scale);
    return result;
  }
  function cylinder(parent, radius, height, y, color, roughness = 0.5, kind = "", bottom = radius) {
    return mesh(new THREE.CylinderGeometry(radius, bottom, height, 48), material(color, roughness, kind), parent, 0, y, 0);
  }
  function layer(name, y) {
    const group = new THREE.Group();
    group.name = name;
    group.position.y = y;
    group.userData.targetY = y;
    food.add(group);
    layers.push(group);
    return group;
  }
  function roundedSlab(width, depth, height, radius = 0.15) {
    const s = new THREE.Shape(), x = -width / 2, z = -depth / 2;
    s.moveTo(x + radius, z);
    s.lineTo(x + width - radius, z); s.quadraticCurveTo(x + width, z, x + width, z + radius);
    s.lineTo(x + width, z + depth - radius); s.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth);
    s.lineTo(x + radius, z + depth); s.quadraticCurveTo(x, z + depth, x, z + depth - radius);
    s.lineTo(x, z + radius); s.quadraticCurveTo(x, z, x + radius, z);
    const geometry = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, steps: 1, curveSegments: 6 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    return geometry;
  }
  function tube(parent, points, radius, color, segments = 40, roughness = 0.5) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 8, false), material(color, roughness), parent);
  }
  function leaf(parent, y, rotation = 0, scale = 1) {
    const geometry = new THREE.CircleGeometry(1.1, 64);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    for (let i = 1; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i), angle = Math.atan2(z, x);
      const spread = 1 + Math.sin(angle * 11) * 0.07 + Math.cos(angle * 7) * 0.04;
      vertices.setXYZ(i, x * spread, Math.sin(angle * 9) * 0.07 + Math.cos(angle * 13) * 0.025, z * spread);
    }
    geometry.computeVertexNormals();
    const leafMaterial = material(0x4f8626, 0.75);
    leafMaterial.side = THREE.DoubleSide;
    const result = mesh(geometry, leafMaterial, parent, 0, y, 0);
    result.rotation.y = rotation;
    result.scale.setScalar(scale);
  }
  function cheese(parent, y, swiss = false) {
    const geometry = new THREE.PlaneGeometry(1.95, 1.95, 10, 10);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i), edge = Math.max(Math.abs(x), Math.abs(z));
      vertices.setY(i, -Math.max(0, edge - 0.68) * 0.55 + Math.sin(x * 5 + z * 3) * 0.025);
    }
    geometry.computeVertexNormals();
    const mat = material(swiss ? 0xf7d489 : 0xf1b334, 0.36);
    mat.side = THREE.DoubleSide;
    const result = mesh(geometry, mat, parent, 0, y, 0);
    result.rotation.y = 0.24;
  }
  function tomato(parent, y) {
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3;
      const slice = new THREE.Group();
      slice.position.set(Math.cos(angle) * 0.44, y, Math.sin(angle) * 0.44);
      parent.add(slice);
      cylinder(slice, 0.54, 0.1, 0, 0xc93926, 0.32);
      cylinder(slice, 0.46, 0.011, 0.057, 0xec6647, 0.42);
      for (let j = 0; j < 7; j++) {
        const a = j * Math.PI * 2 / 7;
        sphere(slice, Math.cos(a) * 0.28, 0.067, Math.sin(a) * 0.28, 0.055, 0xefbb68, [1, 0.15, 0.6]);
      }
    }
  }
  function pickles(parent, y) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      const pickle = mesh(new THREE.CylinderGeometry(0.27, 0.28, 0.075, 24), material(0x789342, 0.42), parent, Math.cos(a) * 0.55, y, Math.sin(a) * 0.5);
      pickle.rotation.z = 0.08 * Math.sin(a);
      const center = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.006, 24), material(0xa6b566, 0.5), pickle, 0, 0.041, 0);
      center.receiveShadow = false;
    }
  }
  function bacon(parent, y, count = 3) {
    for (let k = 0; k < count; k++) {
      const geometry = new THREE.PlaneGeometry(1.85, 0.22, 18, 2);
      geometry.rotateX(-Math.PI / 2);
      const vertices = geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) vertices.setY(i, Math.sin(vertices.getX(i) * 9 + k) * 0.05);
      geometry.computeVertexNormals();
      const mat = material(0x9e422a, 0.38);
      mat.side = THREE.DoubleSide;
      const strip = mesh(geometry, mat, parent, 0, y, (k - (count - 1) / 2) * 0.33);
      strip.rotation.y = k % 2 ? -0.18 : 0.15;
      tube(strip, [[-0.84, 0.02, 0], [-0.4, 0.045, 0.015], [0, -0.03, 0], [0.4, -0.01, 0.01], [0.84, 0.04, 0]], 0.023, 0xd58d62, 20);
    }
  }
  function blueberries(parent, y, count = 11) {
    const random = rng(901);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.84;
      const berry = sphere(parent, Math.cos(a) * r, y + random() * 0.05, Math.sin(a) * r, 0.105, 0x27344d, [1, 0.92, 1], 0.45);
      const crown = mesh(new THREE.TorusGeometry(0.025, 0.012, 6, 5), material(0x52607c, 0.65), berry, 0, 0.092, 0);
      crown.rotation.x = Math.PI / 2;
    }
  }
  function sauce(parent, y, color = 0x98531e, radius = 0.9) {
    const disk = mesh(new THREE.CylinderGeometry(radius, radius * 0.98, 0.025, 48), material(color, 0.13), parent, 0, y, 0);
    disk.scale.z = 0.9;
    for (let i = 0; i < 5; i++) {
      const angle = i * 1.38 + 0.2;
      const x = Math.cos(angle) * radius * 0.89, z = Math.sin(angle) * radius * 0.89;
      tube(parent, [[x * 0.85, y + 0.01, z * 0.85], [x, y, z], [x * 1.02, y - 0.2, z * 1.02]], 0.043, color, 15, 0.13);
    }
  }
  function whip(parent, y, scale = 1) {
    const points = [];
    for (let i = 0; i <= 90; i++) {
      const t = i / 90, a = t * Math.PI * 6.5, r = 0.43 * (1 - t);
      points.push([Math.cos(a) * r * scale, y + t * 0.7 * scale, Math.sin(a) * r * scale]);
    }
    tube(parent, points, 0.12 * scale, 0xfff3db, 110, 0.68);
  }
  function cherry(parent, y, x = 0, z = 0) {
    sphere(parent, x, y, z, 0.13, 0xaa1928, [1, 0.93, 1], 0.22);
    tube(parent, [[x, y + 0.09, z], [x + 0.04, y + 0.3, z - 0.02], [x + 0.16, y + 0.39, z]], 0.012, 0x594b24, 15);
  }
  function ingredientSelection(currentItem, currentOptions) {
    const set = new Set();
    const values = {};
    for (const group of currentItem.options || []) {
      let selected = currentOptions?.[group.id];
      if (selected === undefined) {
        selected = group.type === "multiple" ? group.choices.filter(c => c.default).map(c => c.id) : (group.choices.find(c => c.default) || group.choices[0])?.id;
      }
      values[group.id] = selected;
      for (const choice of group.choices || []) {
        if (Array.isArray(selected) ? selected.includes(choice.id) : selected === choice.id) {
          if (choice.ingredient) set.add(choice.ingredient);
          set.add(choice.id);
        }
      }
    }
    return { has: name => set.has(name), values };
  }

  function buildBurger(selected, sandwich = false) {
    let y = 0.37;
    const base = layer("bread-bottom", y);
    const breadColor = selected.has("sourdough") ? 0xffe8c1 : 0xffffff;
    if (sandwich) {
      mesh(roundedSlab(2.05, 1.65, 0.23, 0.16), material(breadColor, 0.72, "toast"), base);
    } else {
      const bun = mesh(new THREE.SphereGeometry(1.05, 48, 24), material(0xffffff, 0.5, "bun"), base);
      bun.scale.y = 0.21;
    }
    y += 0.18;
    if (selected.has("sauce")) {
      const spread = layer("house-sauce", y - 0.035);
      cylinder(spread, 0.94, 0.035, 0, selected.values.sauce === "smoky" ? 0x943f28 : 0xe4ad74, 0.25);
      y += 0.025;
    }
    const vegetable = item.id === "garden-state-melt";
    const chicken = item.id === "crispy-chicken-club";
    const pattyCount = vegetable ? 0 : selected.has("extra-patty") ? 2 : 1;
    for (let i = 0; i < pattyCount; i++) {
      const patty = layer(`patty-${i}`, y + 0.14);
      const g = new THREE.CylinderGeometry(0.99, 1.02, 0.27, 64, 3);
      const position = g.attributes.position;
      for (let v = 0; v < position.count; v++) {
        const x = position.getX(v), z = position.getZ(v), a = Math.atan2(z, x), irregularity = 1 + Math.sin(a * 17) * 0.022;
        position.setXYZ(v, x * irregularity, position.getY(v) + Math.cos(a * 11) * 0.015, z * irregularity);
      }
      g.computeVertexNormals();
      mesh(g, material(0xffffff, 0.82, vegetable ? "toast" : chicken ? "crumb" : "patty"), patty);
      y += 0.27;
      if (selected.has("cheese") || selected.has("swiss")) {
        const cheeseLayer = layer(`cheese-${i}`, y + 0.055);
        cheese(cheeseLayer, 0, selected.has("swiss"));
        y += 0.09;
      }
    }
    if (vegetable && (selected.has("cheese") || selected.has("swiss"))) {
      cheese(layer("cheese-0", y + 0.05), 0, selected.has("swiss"));
      y += 0.1;
    }
    if (selected.has("bacon")) { bacon(layer("bacon", y + 0.04), 0); y += 0.1; }
    if (selected.has("mushroom")) {
      const mushrooms = layer("mushroom", y + 0.04);
      for (let i = 0; i < 7; i++) sphere(mushrooms, Math.cos(i * 2.4) * 0.65, 0, Math.sin(i * 2.4) * 0.6, 0.23, 0x9f886e, [1, 0.45, 0.8]);
      y += 0.13;
    }
    for (const vegetableName of ["pepper", "zucchini"]) {
      if (!selected.has(vegetableName)) continue;
      const vegetables = layer(vegetableName, y + 0.05);
      for (let i = 0; i < 6; i++) {
        const x = Math.cos(i * 2.4) * 0.6, z = Math.sin(i * 2.4) * 0.5;
        if (vegetableName === "zucchini") {
          const slice = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 28), material(0x678447, 0.45), vegetables, x, i * 0.008, z);
          slice.rotation.z = i * 0.03;
        } else {
          const pepper = tube(vegetables, [[x - 0.19, 0, z - 0.12], [x - 0.15, 0.015, z + 0.17], [x + 0.16, 0.02, z + 0.19], [x + 0.2, 0, z - 0.08]], 0.07, 0xbf4c2c, 18, 0.45);
          pepper.rotation.y = i * 0.12;
        }
      }
      y += 0.13;
    }
    if (selected.has("tomato")) { tomato(layer("tomato", y + 0.05), 0); y += 0.12; }
    if (selected.has("pickle")) { pickles(layer("pickle", y + 0.04), 0); y += 0.08; }
    if (selected.has("onion")) {
      const onions = layer("onion", y + 0.04);
      for (let i = 0; i < 3; i++) {
        const ring = mesh(new THREE.TorusGeometry(0.48 - i * 0.07, 0.04, 8, 40), material(0xe3cece, 0.58), onions, (i - 1) * 0.32, i * 0.025, (i % 2) * 0.15);
        ring.rotation.x = Math.PI / 2;
      }
      y += 0.1;
    }
    if (selected.has("lettuce")) { const lettuce = layer("lettuce", y + 0.03); leaf(lettuce, 0); leaf(lettuce, 0.04, 1.1, 1.02); y += 0.12; }
    if (selected.has("avocado")) {
      const avocado = layer("avocado", y + 0.055);
      for (let i = 0; i < 5; i++) sphere(avocado, (i - 2) * 0.27, i * 0.007, 0, 0.68, 0xa4b966, [0.23, 0.1, 1], 0.6);
      y += 0.12;
    }
    const top = layer("bread-top", y + (sandwich ? 0.13 : 0.02));
    if (sandwich) {
      mesh(roundedSlab(2.05, 1.65, 0.23, 0.16), material(breadColor, 0.72, "toast"), top);
      top.rotation.y = -0.04;
      for (let i = -2; i <= 2; i++) {
        const grill = mesh(roundedSlab(1.7, 0.035, 0.004, 0.01), material(0x6e391d, 0.9), top, 0, 0.15, i * 0.29);
        grill.rotation.y = -0.4;
      }
    } else {
      const bun = mesh(new THREE.SphereGeometry(1.08, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), material(0xffffff, 0.44, "bun"), top);
      bun.scale.y = 0.59;
      const random = rng(7823);
      for (let i = 0; i < 57; i++) {
        const r = Math.sqrt(random()) * 0.94, a = random() * Math.PI * 2;
        const seed = sphere(top, Math.cos(a) * r, Math.sqrt(1 - (r / 1.08) ** 2) * 0.638 + 0.012, Math.sin(a) * r, 0.032, 0xf5e1b2, [0.65, 0.35, 1.5], 0.7);
        seed.rotation.y = random() * Math.PI;
        seed.rotation.z = -Math.cos(a) * r * 0.4;
      }
    }
  }

  function buildPancakes(selected, frenchToast = false) {
    const count = frenchToast ? (selected.has("three") ? 3 : 2) : (selected.has("tall") ? 5 : 3);
    const step = frenchToast ? 0.25 : 0.22;
    for (let i = 0; i < count; i++) {
      const cake = layer(`cake-${i}`, 0.28 + i * step);
      if (frenchToast) {
        mesh(roundedSlab(1.7, 1.55, 0.2, 0.17), material(0xffffff, 0.75, "toast"), cake);
        cake.rotation.y = (i % 2) * 0.27 - 0.12;
      } else {
        const pancake = mesh(new THREE.CylinderGeometry(1.05, 1.03, 0.19, 64), material(0xffffff, 0.75, "pancake"), cake);
        pancake.rotation.y = i * 0.7;
        const edge = mesh(new THREE.TorusGeometry(1.017, 0.041, 8, 60), material(0xe6bc7d, 0.8), cake, 0, -0.04, 0);
        edge.rotation.x = Math.PI / 2;
      }
    }
    let y = 0.39 + (count - 1) * step;
    if (selected.has("syrup")) { sauce(layer("syrup", y), 0, 0xa16221, 0.9); y += 0.04; }
    if (selected.has("blueberry")) blueberries(layer("blueberry", y + 0.08), 0);
    if (selected.has("butter")) {
      const butter = layer("butter", y + 0.08);
      mesh(roundedSlab(0.42, 0.43, 0.1, 0.04), material(0xf3d778, 0.5), butter);
      butter.rotation.y = 0.25;
    }
    if (selected.has("chocolate")) {
      const chips = layer("chocolate", y + 0.05), random = rng(99);
      for (let i = 0; i < 28; i++) {
        const chip = mesh(new THREE.ConeGeometry(0.045, 0.065, 7), material(0x4e291b, 0.4), chips, (random() - 0.5) * 1.5, 0.025, (random() - 0.5) * 1.5);
        chip.rotation.y = random() * 4;
      }
    }
    if (selected.has("whipped-cream")) whip(layer("whipped-cream", y + 0.06), 0, 0.65);
    if (selected.has("cinnamon")) {
      const dust = layer("cinnamon", y + 0.035), random = rng(32);
      for (let i = 0; i < 50; i++) sphere(dust, (random() - 0.5) * 1.5, 0, (random() - 0.5) * 1.2, 0.014, 0x89512c, [1, 0.2, 1]);
    }
    targetHeight = (frenchToast ? 0.5 : 0.56 + (count - 3) * 0.1) + (selected.has("whipped-cream") ? 0.18 : 0);
  }

  function buildDrink(selected) {
    const large = selected.has("large"), isSoda = item.model === "soda", isFloat = item.model === "float";
    const cup = layer("glass", 0.2);
    const glassProfile = [new THREE.Vector2(0.35, 0), new THREE.Vector2(0.39, 0.08), new THREE.Vector2(0.4, 0.14), new THREE.Vector2(0.47, 1.05), new THREE.Vector2(0.6, 1.85), new THREE.Vector2(0.62, 1.9), new THREE.Vector2(0.59, 1.91), new THREE.Vector2(0.57, 1.85), new THREE.Vector2(0.44, 1.05), new THREE.Vector2(0.37, 0.17)];
    mesh(new THREE.LatheGeometry(glassProfile, 64), glass, cup);
    cylinder(cup, 0.44, 0.065, 0.015, 0xb4b9b4, 0.16);
    const color = isSoda ? 0xc94e5c : isFloat ? 0x4b2b1c : item.id === "chocolate-shake" ? 0x88503c : item.id === "vanilla-malt" ? 0xf1d9ae : 0xeaaaaf;
    const liquid = layer("drink", 0.37);
    cylinder(liquid, 0.565, 1.61, 0.8, color, isSoda || isFloat ? 0.17 : 0.6, "", 0.365);
    if (isSoda && selected.values.ice !== "none") {
      const ice = layer("ice", 1.79);
      for (let i = 0; i < (selected.values.ice === "light" ? 3 : 7); i++) {
        const cube = mesh(roundedSlab(0.24, 0.28, 0.22, 0.05), glass, ice, Math.cos(i * 2.4) * 0.31, Math.sin(i * 2) * 0.05, Math.sin(i * 2.4) * 0.3);
        cube.rotation.set(i * 0.2, i * 0.7, 0.2);
      }
    }
    let topY = 2.01;
    if (isFloat) {
      const iceCream = layer("ice-cream", topY);
      sphere(iceCream, 0, 0.1, 0, 0.49, selected.values.scoop === "chocolate" ? 0x9a6a4d : 0xf5e3bd, [1, 0.9, 1], 0.8);
      topY += 0.43;
    }
    if (selected.has("whipped-cream")) { whip(layer("whipped-cream", topY), 0, 0.94); topY += 0.7; }
    if (selected.has("cherry")) cherry(layer("cherry", topY + 0.02), 0);
    if (Array.isArray(selected.values.toppings) && selected.values.toppings.includes("chocolate")) {
      const drizzle = layer("chocolate", topY - 0.13);
      for (let i = 0; i < 4; i++) tube(drizzle, [[-0.3, i * 0.07, -0.28 + i * 0.16], [0, 0.08 + i * 0.07, -0.28 + i * 0.16], [0.3, i * 0.07, -0.28 + i * 0.16]], 0.025, 0x4e291b, 16, 0.25);
    }
    const straw = layer("straw", 1.63);
    straw.position.x = 0.3; straw.position.z = -0.18; straw.rotation.z = -0.2;
    cylinder(straw, 0.038, 1.55, 0.65, 0xfff7e7, 0.5);
    for (let i = 0; i < 9; i++) cylinder(straw, 0.039, 0.065, i * 0.16, 0xb62d38, 0.5);
    if (large) food.scale.set(1.1, 1.12, 1.1);
    targetHeight = large ? 1.58 : 1.4;
  }

  function buildBreakfast(selected) {
    const eggs = layer("eggs", 0.26);
    if (selected.has("scrambled")) {
      const random = rng(73);
      for (let i = 0; i < 19; i++) sphere(eggs, -0.35 + (random() - 0.5) * 0.85, random() * 0.09, (random() - 0.5) * 0.68, 0.18, 0xf0c95d, [1, 0.65, 0.8], 0.7);
    } else {
      for (let i = 0; i < 2; i++) {
        sphere(eggs, -0.35, 0, (i - 0.5) * 0.64, 0.48, 0xfff2dc, [1.1, 0.09, 0.83], 0.48);
        sphere(eggs, -0.29, 0.06, (i - 0.5) * 0.64, 0.2, 0xeeb331, [1, 0.57, 1], 0.22);
      }
    }
    const protein = layer("protein", 0.3);
    if (selected.has("sausage")) {
      for (let i = 0; i < 3; i++) {
        const sausage = mesh(new THREE.CapsuleGeometry(0.105, 0.7, 5, 14), material(0x8c4c29, 0.5), protein, 0.53 + i * 0.16, 0.02, 0.05);
        sausage.rotation.x = Math.PI / 2;
      }
    } else if (selected.has("bacon")) { bacon(protein, 0.02, 2); protein.position.x = 0.6; protein.scale.set(0.55, 1, 1); }
    else {
      for (let i = 0; i < 5; i++) {
        sphere(protein, 0.74 + (i % 2) * 0.12, 0.04, (i - 2) * 0.21, 0.2, 0x9b8066, [1, 0.45, 0.85]);
        sphere(protein, 0.74 + (i % 2) * 0.12, -0.03, (i - 2) * 0.21, 0.08, 0xcbb996, [0.6, 0.8, 0.6]);
      }
    }
    if (selected.has("potato")) potatoPile(layer("potato", 0.27), -0.1, 0.83);
    if (selected.has("toast")) {
      const toast = layer("toast", 0.31);
      const piece = mesh(roundedSlab(0.75, 0.7, 0.13, 0.08), material(0xffffff, 0.8, "toast"), toast, -0.9, 0, 0.5);
      piece.rotation.y = -0.4;
    }
    if (selected.has("avocado")) { const avo = layer("avocado", 0.31); for (let i = 0; i < 4; i++) sphere(avo, 0.1 + i * 0.11, i * 0.02, -0.82, 0.34, 0xa3b95f, [0.3, 0.18, 1]); }
    targetHeight = 0.55;
  }
  function potatoPile(parent, x = 0, z = 0) {
    const random = rng(382);
    for (let i = 0; i < 15; i++) {
      const cube = mesh(roundedSlab(0.2, 0.23, 0.16, 0.035), material(0xffffff, 0.75, "potato"), parent, x + (random() - 0.5) * 0.75, random() * 0.13, z + (random() - 0.5) * 0.35);
      cube.rotation.y = random() * Math.PI;
    }
  }
  function bowl(parent, glassBowl = false) {
    mesh(new THREE.LatheGeometry([new THREE.Vector2(0.55, 0), new THREE.Vector2(0.65, 0.04), new THREE.Vector2(0.95, 0.35), new THREE.Vector2(1.08, 0.67), new THREE.Vector2(1.07, 0.72), new THREE.Vector2(1.02, 0.71), new THREE.Vector2(0.91, 0.4), new THREE.Vector2(0.59, 0.1)], 48), glassBowl ? glass : plateMaterial, parent);
  }
  function buildSides(selected) {
    const dish = layer("bowl", 0.18);
    bowl(dish);
    const pile = layer("food", 0.72), random = rng(562);
    const count = selected.has("large") ? 48 : 32;
    if (item.model === "fries") {
      for (let i = 0; i < count; i++) {
        const fry = mesh(roundedSlab(0.1, 0.75 + random() * 0.5, 0.1, 0.025), material(0xffffff, 0.7, "potato"), pile, (random() - 0.5) * 1.4, random() * 0.42, (random() - 0.5) * 1.1);
        fry.rotation.set((random() - 0.5) * 0.6, random() * Math.PI, (random() - 0.5) * 0.55);
      }
    } else if (item.model === "pickles") {
      for (let i = 0; i < (selected.has("large") ? 10 : 7); i++) {
        const pickle = mesh(new THREE.CapsuleGeometry(0.13, 0.83, 4, 14), material(0xffffff, 0.9, "crumb"), pile, (random() - 0.5) * 1.2, random() * 0.24, (random() - 0.5) * 0.9);
        pickle.rotation.set(Math.PI / 2 + random() * 0.6, random() * Math.PI, random() * 0.4);
      }
    } else {
      for (let i = 0; i < (selected.has("large") ? 85 : 65); i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 0.87;
        const noodle = mesh(new THREE.TorusGeometry(0.11, 0.052, 7, 10, Math.PI * 1.3), material(0xe7b142, 0.52), pile, Math.cos(angle) * radius, random() * 0.22, Math.sin(angle) * radius);
        noodle.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }
    if (selected.has("cheese")) {
      const topping = layer("cheese", 1.02);
      for (let i = 0; i < 9; i++) tube(topping, [[-0.65, i * 0.006, -0.6 + i * 0.15], [0, 0.03, -0.54 + i * 0.15], [0.65, -0.05, -0.6 + i * 0.15]], 0.04, 0xeab33c, 20, 0.4);
    }
    if (selected.has("chili")) {
      const chili = layer("chili", 1.06);
      for (let i = 0; i < 28; i++) sphere(chili, (random() - 0.5) * 1.25, random() * 0.14, (random() - 0.5) * 1.1, 0.08, 0x74402a, [1, 0.7, 0.8], 0.6);
    }
    if (selected.has("bacon")) { const top = layer("bacon", 1.13); bacon(top, 0, 2); top.scale.setScalar(0.65); }
    if (selected.has("onion")) {
      const onions = layer("onion", 1.12);
      for (let i = 0; i < 18; i++) {
        const piece = mesh(new THREE.BoxGeometry(0.065, 0.04, 0.08), material(0xf0e2ce, 0.55), onions, (random() - 0.5) * 1.3, random() * 0.07, (random() - 0.5) * 1.1);
        piece.rotation.y = random() * 5;
      }
    }
    if (selected.has("crumbs")) {
      const crumbs = layer("crumbs", 0.98);
      for (let i = 0; i < 70; i++) sphere(crumbs, (random() - 0.5) * 1.4, random() * 0.04, (random() - 0.5) * 1.3, 0.022, 0xb97c32, [1, 0.5, 0.9], 0.95);
    }
    if (item.model === "pickles" && selected.values.dip !== "none") {
      const dip = layer("dip", 0.39);
      dip.position.x = 0.95; dip.position.z = 0.72;
      cylinder(dip, 0.31, 0.15, 0, 0xf2ecdf, 0.25);
      cylinder(dip, 0.26, 0.012, 0.08, selected.values.dip === "house" ? 0xe1ac79 : 0xe9e2ce, 0.35);
    }
    if (selected.has("large")) food.scale.setScalar(1.08);
    targetHeight = 0.8;
  }
  function pieSlice(parent, y, color, height) {
    // A closed extruded sector includes the two cut faces of the slice.
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.65);
    shape.lineTo(Math.cos(Math.PI / 6) * 1.05, -0.65 + Math.sin(Math.PI / 6) * 1.05);
    shape.absarc(0, -0.65, 1.05, Math.PI / 6, Math.PI * 5 / 6, false);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 2, curveSegments: 24 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    return mesh(geometry, material(color, 0.65), parent, 0, y, 0);
  }
  function buildDessert(selected) {
    let y = 0.28;
    let scoopSurface = null;
    if (item.model === "sundae") {
      bowl(layer("glass-bowl", 0.2), true);
      const scoops = layer("ice-cream", 0.92);
      sphere(scoops, -0.35, 0, 0.08, 0.43, 0xf3dfbd, [1, 0.9, 1], 0.85);
      sphere(scoops, 0.32, 0, 0.11, 0.43, 0xe8d2af, [1, 0.9, 1], 0.85);
      sphere(scoops, 0, 0.37, 0, 0.44, 0xf4e2bd, [1, 0.95, 1], 0.85);
      scoopSurface = { y: 1.29, radius: 0.44, scaleY: 0.95 };
      y = 1.62;
    } else if (item.model === "brownie") {
      const skillet = layer("skillet", 0.26);
      cylinder(skillet, 1.1, 0.13, 0, 0x292825, 0.8);
      mesh(roundedSlab(0.28, 1.0, 0.1, 0.1), material(0x292825, 0.8), skillet, 0, 0.04, -1.35);
      mesh(roundedSlab(1.45, 1.45, 0.3, 0.08), material(0x5b2e1e, 0.9), layer("brownie", 0.48));
      y = 0.7;
    } else {
      pieSlice(layer("crust", 0.29), 0, 0xc18b4d, 0.12);
      pieSlice(layer("filling", 0.61), 0, item.model === "cheesecake" ? 0xf2ddbb : 0xd7a05f, 0.5);
      if (item.model === "pie") {
        const lattice = layer("pastry", 0.9);
        pieSlice(lattice, 0, 0xd5a667, 0.07);
        for (let i = 0; i < 3; i++) {
          const vent = mesh(roundedSlab(0.025, 0.2, 0.002, 0.01), material(0x9c6b35, 0.78), lattice, -0.25 + i * 0.25, 0.055, -0.08);
          vent.rotation.y = -0.3;
        }
      }
      y = 0.95;
    }
    if (selected.has("ice-cream") || selected.has("vanilla")) {
      sphere(layer("ice-cream", y), 0, 0.28, 0.05, 0.47, 0xf1dfbd, [1, 0.9, 1], 0.85);
      scoopSurface = { y: y + 0.28, radius: 0.47, scaleY: 0.9, z: 0.05 };
      y += 0.65;
    }
    if (selected.has("chocolate")) {
      if (scoopSurface) {
        const glaze = layer("chocolate", scoopSurface.y);
        const cap = mesh(new THREE.SphereGeometry(scoopSurface.radius + 0.008, 40, 20, 0, Math.PI * 2, 0, 1.05), material(0x512b1d, 0.22), glaze, 0, 0, scoopSurface.z || 0);
        cap.scale.y = scoopSurface.scaleY;
      } else sauce(layer("chocolate", y - 0.08), 0, 0x512b1d, 0.47);
    }
    if (selected.has("whipped-cream")) { whip(layer("whipped-cream", y), 0, 0.8); y += 0.56; }
    if (selected.has("cherry")) {
      const cherries = layer("cherry", y);
      if (item.model === "cheesecake") {
        for (let i = 0; i < 8; i++) sphere(cherries, Math.sin(i * 2.3) * 0.4, 0.03 + (i % 2) * 0.08, -0.06 + Math.cos(i * 2.3) * 0.22, 0.12, 0xa3212d, [1, 1, 1], 0.2);
      } else cherry(cherries, 0.02);
    }
    if (selected.has("nuts")) {
      const nuts = layer("nuts", y - 0.1), random = rng(186);
      for (let i = 0; i < 30; i++) sphere(nuts, (random() - 0.5) * 0.8, random() * 0.15, (random() - 0.5) * 0.8, 0.035, 0xa96e30, [1, 0.8, 1.3], 0.75);
    }
    targetHeight = item.model === "sundae" ? 1.1 : 0.75;
  }

  function releaseGeometry(group) {
    group?.traverse(object => object.geometry?.dispose());
  }
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function releaseDeparture(entry) {
    departures.delete(entry);
    entry.owner.remove(entry.group);
    releaseGeometry(entry.group);
    for (const { material: mat } of entry.materials) mat.dispose();
    if (!entry.owner.children.length) turntable.remove(entry.owner);
  }
  function clearDepartures() {
    for (const entry of [...departures]) releaseDeparture(entry);
  }
  function depart(group, owner, time) {
    // Shared recipe materials stay untouched; only the departing copy becomes transparent.
    const copies = new Map();
    group.traverse(object => {
      if (!object.material) return;
      const copy = original => {
        if (!copies.has(original)) {
          const mat = original.clone();
          mat.transparent = true;
          mat.depthWrite = false;
          copies.set(original, { material: mat, opacity: original.opacity });
        }
        return copies.get(original).material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(copy) : copy(object.material);
      object.castShadow = false;
    });
    departures.add({ group, owner, materials: [...copies.values()], startY: group.position.y, startScale: group.scale.clone(), start: time, duration: 300 });
  }
  function viewValue(key) {
    if (key === "rotation") return turntable.rotation.y;
    if (key === "distance") return distance;
    if (key === "elevation") return elevation;
    return viewHeight;
  }
  function setViewValue(key, value) {
    if (key === "rotation") turntable.rotation.y = value;
    else if (key === "distance") distance = value;
    else if (key === "elevation") elevation = value;
    else viewHeight = value;
  }
  function advanceView(time) {
    for (const [key, tween] of viewTweens) {
      const t = clamp((time - tween.start) / tween.duration, 0, 1);
      setViewValue(key, tween.from + (tween.to - tween.from) * easeOut(t));
      if (t === 1) viewTweens.delete(key);
    }
  }
  function tweenView(values, duration = 360) {
    if (disposed || failed) return;
    const time = performance.now();
    advanceView(time);
    for (const [key, to] of Object.entries(values)) {
      const from = viewValue(key);
      if (reduce || Math.abs(from - to) < 0.0001) {
        setViewValue(key, to);
        viewTweens.delete(key);
      } else viewTweens.set(key, { from, to, start: time, duration });
    }
    if (reduce) render();
    else requestFrame();
  }
  function requestedView(key) { return viewTweens.get(key)?.to ?? viewValue(key); }
  function interruptView() {
    advanceView(performance.now());
    // Direct dragging takes over immediately; ingredient framing can finish independently.
    for (const key of ["rotation", "distance", "elevation"]) viewTweens.delete(key);
  }
  function homeRotation() {
    const current = turntable.rotation.y;
    return current + Math.atan2(Math.sin(-0.24 - current), Math.cos(-0.24 - current));
  }
  function positionCamera() {
    camera.position.set(0, viewHeight + Math.sin(elevation) * distance, Math.cos(elevation) * distance);
    camera.lookAt(0, viewHeight, 0);
  }
  function render() {
    if (!disposed && !failed) { positionCamera(); renderer.render(scene, camera); }
  }
  function settle() {
    cancelAnimationFrame(frame);
    frame = 0;
    for (const group of layers) {
      group.visible = true;
      group.position.y = group.userData.targetY;
      if (group.userData.baseScale) group.scale.copy(group.userData.baseScale);
      delete group.userData.motion;
    }
    if (food?.userData.scaleMotion) {
      food.scale.copy(food.userData.scaleMotion.to);
      delete food.userData.scaleMotion;
    }
    for (const [key, tween] of viewTweens) setViewValue(key, tween.to);
    viewTweens.clear();
    clearDepartures();
    render();
  }
  function advanceAnimations(time) {
    for (const group of layers) {
      const motion = group.userData.motion;
      if (!motion) continue;
      const t = clamp((time - motion.start - motion.delay) / motion.duration, 0, 1);
      const eased = easeOut(t);
      group.visible = t > 0 || motion.existing;
      group.position.y = motion.fromY + (group.userData.targetY - motion.fromY) * eased;
      group.scale.lerpVectors(motion.fromScale, group.userData.baseScale, eased);
      if (t === 1) delete group.userData.motion;
    }
    for (const entry of [...departures]) {
      const t = clamp((time - entry.start) / entry.duration, 0, 1), eased = easeOut(t);
      entry.group.position.y = entry.startY + 0.36 * eased;
      entry.group.scale.copy(entry.startScale).multiplyScalar(1 - 0.18 * eased);
      for (const { material: mat, opacity } of entry.materials) mat.opacity = opacity * (1 - t);
      if (t === 1) releaseDeparture(entry);
    }
    if (food?.userData.scaleMotion) {
      const motion = food.userData.scaleMotion;
      const t = clamp((time - motion.start) / motion.duration, 0, 1);
      food.scale.lerpVectors(motion.from, motion.to, easeOut(t));
      if (t === 1) delete food.userData.scaleMotion;
    }
    advanceView(time);
  }
  function hasMotion() {
    return departures.size || viewTweens.size || food?.userData.scaleMotion || layers.some(group => group.userData.motion);
  }
  function requestFrame() {
    if (!frame && !disposed && !failed) frame = requestAnimationFrame(animate);
  }
  function animate(time) {
    frame = 0;
    if (disposed || failed) return;
    if (reduce) { settle(); return; }
    advanceAnimations(time);
    render();
    if (hasMotion()) requestFrame();
  }
  function startAssembly(previous = new Map(), full = false) {
    if (disposed || failed) return;
    if (full) clearDepartures();
    const time = performance.now();
    layers.forEach((group, i) => {
      group.userData.baseScale ||= group.scale.clone();
      const before = !full && previous.get(group.name);
      const existing = Boolean(before);
      const fromY = existing ? before.y : group.userData.targetY + (full ? 0.65 + i * 0.04 : 0.42);
      const fromScale = existing ? before.scale : group.userData.baseScale.clone().multiplyScalar(0.94);
      group.userData.motion = { fromY, fromScale, existing, start: time, delay: existing ? 0 : full ? Math.min(i * 55, 330) : 45, duration: existing ? 340 : full ? 580 : 460 };
      group.position.y = fromY;
      group.scale.copy(fromScale);
      group.visible = existing;
    });
    if (reduce) { settle(); return; }
    requestFrame();
  }
  function update(nextItem, nextOptions = {}) {
    if (disposed || failed || !nextItem) return;
    const selected = ingredientSelection(nextItem, nextOptions);
    const nextConfiguration = `${nextItem.id}:${JSON.stringify(selected.values)}`;
    if (configurationKey === nextConfiguration) return;
    configurationKey = nextConfiguration;
    const time = performance.now();
    advanceAnimations(time);
    const previous = new Map(layers.map(group => [group.name, { y: group.position.y, scale: group.scale.clone() }]));
    const previousFood = food, previousLayers = layers;
    const initial = !modelKey;
    const changedItem = modelKey !== nextItem.id;
    item = nextItem; options = nextOptions; modelKey = item.id;
    canvas.setAttribute("aria-label", `${item.name}, interactive three-dimensional preview. Drag to rotate. Use arrow keys to rotate or zoom.`);
    food = new THREE.Group();
    turntable.add(food);
    layers = [];
    targetHeight = 1.0;
    switch (item.model) {
      case "sandwich": buildBurger(selected, true); break;
      case "pancakes": buildPancakes(selected); break;
      case "toast": buildPancakes(selected, true); break;
      case "shake": case "soda": case "float": buildDrink(selected); break;
      case "breakfast": buildBreakfast(selected); break;
      case "fries": case "pickles": case "mac": buildSides(selected); break;
      case "pie": case "sundae": case "cheesecake": case "brownie": buildDessert(selected); break;
      default: buildBurger(selected);
    }
    const names = new Set(layers.map(group => group.name));
    if (changedItem || reduce) clearDepartures();
    else {
      // A topping reselected during its exit returns from its current position, without a duplicate.
      for (const entry of [...departures]) {
        if (!names.has(entry.group.name)) continue;
        previous.set(entry.group.name, { y: entry.group.position.y, scale: entry.group.scale.clone() });
        releaseDeparture(entry);
      }
    }
    for (const group of previousLayers) {
      if (!changedItem && !reduce && !names.has(group.name) && group.visible) depart(group, previousFood, time);
      else { previousFood.remove(group); releaseGeometry(group); }
    }
    if (previousFood && !previousFood.children.length) turntable.remove(previousFood);
    if (!changedItem && previousFood && !reduce && !previousFood.scale.equals(food.scale)) {
      food.userData.scaleMotion = { from: previousFood.scale.clone(), to: food.scale.clone(), start: time, duration: 380 };
      food.scale.copy(previousFood.scale);
    }
    if (initial) { turntable.rotation.y = -0.24; viewHeight = targetHeight; }
    else tweenView(changedItem ? { height: targetHeight, rotation: homeRotation(), distance: 6.5, elevation: 0.42 } : { height: targetHeight }, 420);
    startAssembly(changedItem ? new Map() : previous, changedItem);
  }
  function rotate(delta) { tweenView({ rotation: requestedView("rotation") + (Number(delta) || 0) }); }
  function zoom(delta) { tweenView({ distance: clamp(requestedView("distance") - (Number(delta) || 0), 4.2, 9.5) }, 280); }
  function reset() { tweenView({ rotation: homeRotation(), distance: 6.5, elevation: 0.42, height: targetHeight }, 440); }
  function resize() {
    if (disposed) return;
    const bounds = container.getBoundingClientRect();
    const width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  addCleanup(() => resizeObserver.disconnect());
  resizeObserver.observe(container);
  function motionChanged(event) { reduce = event.matches; if (reduce) settle(); }
  addCleanup(() => motionQuery.removeEventListener("change", motionChanged));
  motionQuery.addEventListener("change", motionChanged);
  function pointerDown(event) {
    interruptView();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
    if (pointers.size === 2) { const p = [...pointers.values()]; pinchDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
  }
  function pointerMove(event) {
    const before = pointers.get(event.pointerId);
    if (!before) return;
    interruptView();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      turntable.rotation.y += (event.clientX - before.x) * 0.009;
      elevation = clamp(elevation + (event.clientY - before.y) * 0.003, 0.14, 1.02);
      render();
    } else if (pointers.size === 2) {
      const p = [...pointers.values()], nextDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      distance = clamp(distance - (nextDistance - pinchDistance) * 0.018, 4.2, 9.5);
      pinchDistance = nextDistance;
      render();
    }
  }
  function pointerUp(event) { pointers.delete(event.pointerId); if (!pointers.size) canvas.style.cursor = "grab"; }
  function wheel(event) { event.preventDefault(); zoom(-event.deltaY * 0.004); }
  function keyboard(event) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); rotate(event.key === "ArrowLeft" ? -0.25 : 0.25); }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); zoom(event.key === "ArrowUp" ? 0.35 : -0.35); }
    if (event.key === "Home") { event.preventDefault(); reset(); }
  }
  function contextLost(event) {
    event.preventDefault();
    failed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    clearDepartures();
    viewTweens.clear();
    canvas.hidden = true;
    onFallback();
  }
  const listeners = [["pointerdown", pointerDown], ["pointermove", pointerMove], ["pointerup", pointerUp], ["pointercancel", pointerUp], ["lostpointercapture", pointerUp], ["keydown", keyboard], ["webglcontextlost", contextLost]];
  addCleanup(() => {
    for (const [name, handler] of listeners) canvas.removeEventListener(name, handler);
    canvas.removeEventListener("wheel", wheel);
  });
  for (const [name, handler] of listeners) canvas.addEventListener(name, handler);
  canvas.addEventListener("wheel", wheel, { passive: false });

  function dispose() {
    if (disposed) return;
    disposed = true;
    cleanup();
    pointers.clear();
    viewTweens.clear();
  }

  update(item, options);
  resize();
  return { update, rotate, zoom, reset, assemble: () => startAssembly(new Map(), true), dispose };
}
