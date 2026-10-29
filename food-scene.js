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
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  addCleanup(() => scene.traverse(object => { object.geometry?.dispose(); object.shadow?.dispose(); }));
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  const turntable = new THREE.Group();
  scene.add(turntable);
  scene.add(new THREE.HemisphereLight(0xfff7ee, 0x807362, 2.05));
  const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.25);
  keyLight.position.set(-3, 6, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -3.8, right: 3.8, top: 4.5, bottom: -3.8, near: 0.5, far: 15 });
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 4;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xe4edff, 0.7);
  fillLight.position.set(4, 2.5, -2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffe8cd, 0.65);
  rimLight.position.set(2, 4, -4);
  scene.add(rimLight);

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
    const size = 256, pixels = new Uint8Array(size * size * 4);
    const palettes = {
      bun: [193, 137, 73], patty: [72, 47, 32], pancake: [199, 142, 77],
      toast: [200, 155, 98], crumb: [198, 142, 66], potato: [227, 179, 85],
    };
    const base = palettes[kind] || palettes.toast;
    const seed = [...kind].reduce((value, char) => value * 31 + char.charCodeAt(0), 7) >>> 0;
    const hash = (x, y, period) => {
      x = ((x % period) + period) % period;
      y = ((y % period) + period) % period;
      let n = Math.imul(x + seed, 374761393) + Math.imul(y, 668265263);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };
    const noise = (u, v, period) => {
      const x = u * period, y = v * period, ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const tx = fx * fx * (3 - 2 * fx), ty = fy * fy * (3 - 2 * fy);
      const top = hash(ix, iy, period) * (1 - tx) + hash(ix + 1, iy, period) * tx;
      const bottom = hash(ix, iy + 1, period) * (1 - tx) + hash(ix + 1, iy + 1, period) * tx;
      return top * (1 - ty) + bottom * ty;
    };
    const charred = kind === "patty", breaded = kind === "crumb";
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      const broad = noise(u, v, 5), medium = noise(u, v, 19), fine = noise(u, v, 73);
      let variation;
      if (kind === "bun") {
        // Quiet browning and fine pores; no stretched cloud bands resembling wood grain.
        variation = (broad - 0.5) * 0.08 + (medium - 0.5) * 0.045 + (fine - 0.5) * 0.1;
        if (fine < 0.23) variation -= 0.025;
      } else if (charred) {
        // Beef is consistently dark brown; searing should not turn into black/tan camouflage.
        variation = (broad - 0.5) * 0.1 + (medium - 0.5) * 0.16 + (fine - 0.5) * 0.12;
        if (medium < 0.3) variation -= 0.035;
      } else {
        variation = (broad - 0.5) * 0.32 + (medium - 0.5) * 0.3 + (fine - 0.5) * 0.13;
        if (breaded) variation += (fine - 0.5) * 0.45;
        if (fine < 0.24) variation -= 0.1;
      }
      const i = (y * size + x) * 4;
      pixels[i] = clamp(base[0] * (1 + variation), 0, 255);
      pixels[i + 1] = clamp(base[1] * (1 + variation * 1.12), 0, 255);
      pixels[i + 2] = clamp(base[2] * (1 + variation * 1.2), 0, 255);
      pixels[i + 3] = 255;
    }
    const result = new THREE.DataTexture(pixels, size, size);
    result.colorSpace = THREE.SRGBColorSpace;
    if (kind === "bun") result.repeat.set(4, 1);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.magFilter = THREE.LinearFilter;
    result.minFilter = THREE.LinearMipmapLinearFilter;
    result.generateMipmaps = true;
    result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    result.needsUpdate = true;
    textures.set(kind, result);
    return result;
  }

  // Neutral, seamless microstructure preserves each ingredient's own color.
  // Data maps use linear values; only the existing albedo paintings use sRGB.
  function surfaceDetail(coarse = false) {
    const key = coarse ? "detail-coarse" : "detail-fine";
    if (textures.has(key)) return textures.get(key);
    const size = 128, data = new Uint8Array(size * size * 4), random = rng(coarse ? 817 : 293);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const grain = random();
      const pores = coarse && grain < 0.1 ? -28 : 0;
      const value = Math.round(clamp(185 + (grain - 0.5) * (coarse ? 55 : 28) + pores, 0, 255));
      const offset = (y * size + x) * 4;
      data[offset] = data[offset + 1] = data[offset + 2] = value;
      data[offset + 3] = 255;
    }
    const result = new THREE.DataTexture(data, size, size);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.magFilter = THREE.LinearFilter;
    result.minFilter = THREE.LinearMipmapLinearFilter;
    result.generateMipmaps = true;
    result.repeat.set(coarse ? 3 : 5, coarse ? 3 : 5);
    result.needsUpdate = true;
    textures.set(key, result);
    return result;
  }

  function material(color, roughness = 0.55, kind = "") {
    const key = `${color}|${roughness}|${kind}`;
    if (!materialCache.has(key)) {
      const coarse = ["patty", "crumb", "toast", "potato"].includes(kind) || roughness >= 0.75;
      const foodSurface = Boolean(kind) || (roughness >= 0.32 && color !== 0x292825);
      const detail = foodSurface ? surfaceDetail(coarse) : null;
      const dryRoughness = { bun: 0.82, patty: 0.91, pancake: 0.88, toast: 0.9, crumb: 0.94, potato: 0.84 };
      const surfaceRoughness = dryRoughness[kind] ?? (foodSurface ? Math.max(0.52, roughness) : roughness);
      const mat = new THREE.MeshPhysicalMaterial({
        color, roughness: surfaceRoughness, metalness: 0,
        specularIntensity: kind ? 0.24 : foodSurface ? 0.38 : 0.6,
        ...(kind ? { map: texture(kind) } : {}),
        ...(detail ? { bumpMap: detail, bumpScale: kind === "bun" ? 0.0018 : coarse ? 0.008 : 0.003 } : {}),
        // Keep food diffuse. The shared bump map must not reduce its roughness.
        clearcoat: !kind && roughness < 0.25 ? 0.06 : 0,
        clearcoatRoughness: 0.5,
      });
      mat.userData.organic = foodSurface;
      materialCache.set(key, mat);
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
    // Continuous position-based displacement keeps duplicate seam vertices joined.
    // Restrict this to curved food meshes so dishes, glass, and cut edges stay clean.
    if (mat.userData.organic && ["SphereGeometry", "CylinderGeometry", "CapsuleGeometry", "TorusGeometry"].includes(geometry.type)) {
      const positions = geometry.attributes.position;
      const strength = mat.roughness >= 0.7 ? 0.012 : 0.004;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        const wave = Math.sin(x * 17 + z * 11) * Math.cos(y * 21 - z * 9);
        // Radial displacement is seam-safe, including cylinder cap boundaries.
        const length = Math.hypot(x, y, z) || 1;
        positions.setXYZ(i, x + x / length * wave * strength,
          y + y / length * wave * strength, z + z / length * wave * strength);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
    }
    const result = new THREE.Mesh(geometry, mat);
    result.position.set(x, y, z);
    result.castShadow = result.receiveShadow = true;
    parent.add(result);
    return result;
  }
  function sphere(parent, x, y, z, radius, color, scale = [1, 1, 1], roughness = 0.5) {
    const scoop = roughness >= 0.8 && radius > 0.3;
    const geometry = new THREE.SphereGeometry(radius, scoop ? 48 : 24, scoop ? 32 : 16);
    if (scoop) {
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const px = positions.getX(i), py = positions.getY(i), pz = positions.getZ(i);
        const angle = Math.atan2(pz, px), latitude = py / radius;
        const ridges = Math.sin(angle * 17 + latitude * 7) * 0.009 * Math.max(0, 1 - latitude * latitude);
        const scoopMarks = Math.sin(px * 22 + py * 5) * Math.cos(pz * 19) * 0.007;
        const raggedEdge = Math.exp(-(((latitude + 0.55) / 0.17) ** 2)) * (0.018 + Math.sin(angle * 21) * 0.009);
        const displacement = ridges + scoopMarks + raggedEdge;
        positions.setXYZ(i, px * (1 + displacement / radius), py * (1 + displacement / radius), pz * (1 + displacement / radius));
      }
      geometry.computeVertexNormals();
    }
    const result = mesh(geometry, material(color, roughness), parent, x, y, z);
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
    const geometry = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: true, bevelThickness: Math.min(0.025, height * 0.2), bevelSize: Math.min(0.025, radius * 0.4, height * 0.3), bevelSegments: 3, steps: 1, curveSegments: 6 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    // Project each face in world-sized units, so a thin bread edge does not stretch
    // the entire texture into horizontal wood-like streaks.
    const positions = geometry.attributes.position, normals = geometry.attributes.normal, uv = geometry.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i));
      uv.setXY(i, (ny > 0.6 ? x : nx > 0.6 ? z : x) * 0.65 + 0.5,
        (ny > 0.6 ? z : y) * 0.65 + 0.5);
    }
    return geometry;
  }
  function tube(parent, points, radius, color, segments = 40, roughness = 0.5) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 8, false), material(color, roughness), parent);
  }
  function leaf(parent, y, rotation = 0, scale = 1) {
    // Interior rings let the ruffle flow across the leaf without radial triangular facets.
    const geometry = new THREE.RingGeometry(0, 1.1, 96, 14);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i), angle = Math.atan2(z, x);
      const radial = Math.hypot(x, z) / 1.1;
      const edge = radial ** 3;
      const spread = 1 + edge * (Math.sin(angle * 9) * 0.055 + Math.cos(angle * 5) * 0.035);
      const fold = Math.sin(angle * 7 + radial * 3) * 0.048 * edge;
      vertices.setXYZ(i, x * spread, fold + Math.sin(x * 4 + z * 3) * radial * 0.016, z * spread);
    }
    geometry.computeVertexNormals();
    const leafMaterial = material(0x4f8626, 0.75);
    leafMaterial.side = THREE.DoubleSide;
    const result = mesh(geometry, leafMaterial, parent, 0, y, 0);
    result.rotation.y = rotation;
    result.scale.setScalar(scale);
  }
  function cheese(parent, y, swiss = false, support = "round") {
    const toast = support === "toast";
    const geometry = new THREE.PlaneGeometry(1.95, toast ? 1.56 : 1.95, 40, 40);
    geometry.rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), z = vertices.getZ(i);
      const radiusZ = support === "chicken" ? 0.87 : 1;
      const radius = toast ? Math.max(Math.abs(x) / 0.97, Math.abs(z) / 0.77) : Math.hypot(x, z / radiusZ);
      // Cheese rests on the filling. Only its unsupported perimeter bends down;
      // folding through the center of a patty creates triangular intersections.
      const overhang = Math.max(0, radius - (toast ? 0.96 : 0.93));
      const bentRadius = (toast ? 0.96 : 0.93) + (toast ? 0.05 : 0.2) * (1 - Math.exp(-overhang * 7));
      const scale = overhang ? bentRadius / radius : 1;
      const ripple = Math.sin(x * 5 + z * 3) * 0.002;
      vertices.setXYZ(i, x * scale, -overhang * 0.4 + ripple, z * scale);
    }
    geometry.computeVertexNormals();
    const mat = material(swiss ? 0xf7d489 : 0xf1b334, 0.45);
    mat.side = THREE.DoubleSide;
    const result = mesh(geometry, mat, parent, 0, y, 0);
    // Keep rectangular toast and oval chicken support aligned with their cheese.
    result.rotation.y = support === "round" ? 0.12 : 0;
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
  function sauce(parent, y, color = 0x98531e, radius = 0.9, edgeRadius = radius * 1.16) {
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.009, 96);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i), a = Math.atan2(z, x);
      const spread = 0.83 + Math.sin(a * 3 + 0.4) * 0.085 + Math.cos(a * 5) * 0.045;
      positions.setXYZ(i, x * spread, positions.getY(i), z * spread * 0.88);
    }
    geometry.computeVertexNormals();
    mesh(geometry, material(color, 0.28), parent, 0, y - 0.009, 0);
    for (let i = 0; i < 3; i++) {
      const angle = i * 2.1 + 0.5;
      const dx = Math.cos(angle), dz = Math.sin(angle), reach = edgeRadius + i * 0.004;
      const stream = tube(parent, [[dx * radius * 0.48, y - 0.005, dz * radius * 0.48],
        [dx * radius * 0.85, y - 0.006, dz * radius * 0.85], [dx * reach, y - 0.028, dz * reach],
        [dx * reach, y - 0.12 - i * 0.035, dz * reach]], 0.023 + i * 0.004, color, 26, 0.28);
      // The pool is thin; the rivulet gains depth only as it rounds the food edge.
      const pos = stream.geometry.attributes.position;
      for (let v = 0; v < pos.count; v++) if (pos.getY(v) > y - 0.025) pos.setY(v, y - 0.008 + (pos.getY(v) - y) * 0.2);
      stream.geometry.computeVertexNormals();
    }
  }
  function whip(parent, y, scale = 1) {
    const points = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120, a = t * Math.PI * 6.5, r = 0.36 * (1 - t);
      points.push(new THREE.Vector3(Math.cos(a) * r * scale, y + (0.06 + t * 0.62) * scale, Math.sin(a) * r * scale));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geometry = new THREE.TubeGeometry(curve, 144, 0.13 * scale, 12, false);
    const vertices = geometry.attributes.position;
    for (let i = 0; i <= 144; i++) {
      const t = i / 144, center = curve.getPointAt(t);
      const taper = t < 0.65 ? 1 - t * 0.15 : Math.max(0.025, (1 - t) / 0.35 * 0.9);
      for (let j = 0; j <= 12; j++) {
        const index = i * 13 + j;
        const ridge = 1 + Math.cos(j / 12 * Math.PI * 12) * 0.065;
        vertices.setXYZ(index, center.x + (vertices.getX(index) - center.x) * taper * ridge,
          center.y + (vertices.getY(index) - center.y) * taper * ridge,
          center.z + (vertices.getZ(index) - center.z) * taper * ridge);
      }
    }
    geometry.computeVertexNormals();
    sphere(parent, 0, y + 0.045 * scale, 0, 0.37 * scale, 0xfff3db, [1, 0.24, 1], 0.68);
    mesh(geometry, material(0xfff3db, 0.68), parent);
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

  function grillMarks(parent) {
    for (let i = -2; i <= 2; i++) {
      const shape = new THREE.Shape();
      const samples = 14;
      for (let j = 0; j <= samples; j++) {
        const x = -0.78 + j / samples * 1.56;
        const width = 0.018 + Math.sin(j * 1.9 + i) * 0.004;
        if (!j) shape.moveTo(x, width); else shape.lineTo(x, width);
      }
      for (let j = samples; j >= 0; j--) {
        const x = -0.78 + j / samples * 1.56;
        shape.lineTo(x, -0.014 + Math.cos(j * 1.3 + i) * 0.004);
      }
      shape.closePath();
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      const mark = mesh(geometry, material(i % 2 ? 0x85502b : 0x744323, 0.96), parent, 0, 0.141, i * 0.245);
      mark.rotation.y = -0.3;
      mark.castShadow = false;
    }
  }

  function buildBurger(selected, sandwich = false) {
    const base = layer("bread-bottom", 0.37);
    const breadColor = selected.has("sourdough") ? 0xffe8c1 : 0xffffff;
    if (sandwich) {
      mesh(roundedSlab(2.05, 1.65, 0.23, 0.16), material(breadColor, 0.72, "toast"), base);
    } else {
      const bun = mesh(new THREE.SphereGeometry(1.05, 48, 24), material(0xffffff, 0.5, "bun"), base);
      bun.scale.y = 0.21;
    }
    // Track the contact surface, including the actual thickness of each ingredient.
    let y = sandwich ? 0.50 : 0.58;
    if (selected.has("sauce")) {
      const spread = layer("house-sauce", y);
      const geometry = sandwich ? roundedSlab(1.83, 1.43, 0.009, 0.15) : new THREE.CylinderGeometry(0.94, 0.94, 0.009, 64);
      mesh(geometry, material(selected.values.sauce === "smoky" ? 0x943f28 : 0xe4ad74, 0.42), spread);
      y += 0.006;
    }
    const vegetable = item.id === "garden-state-melt";
    const chicken = item.id === "crispy-chicken-club";
    const pattyCount = vegetable ? 0 : selected.has("extra-patty") ? 2 : 1;
    for (let i = 0; i < pattyCount; i++) {
      const patty = layer(`patty-${i}`, y + (chicken ? 0.14 : 0.11));
      const g = chicken ? new THREE.SphereGeometry(1, 64, 32) : new THREE.LatheGeometry([
        new THREE.Vector2(0, -0.115), new THREE.Vector2(0.92, -0.115),
        new THREE.Vector2(0.985, -0.075), new THREE.Vector2(1.005, -0.01),
        new THREE.Vector2(0.99, 0.065), new THREE.Vector2(0.93, 0.112),
        new THREE.Vector2(0, 0.12),
      ], 96);
      const position = g.attributes.position, uv = g.attributes.uv;
      for (let v = 0; v < position.count; v++) {
        const x = position.getX(v), z = position.getZ(v), py = position.getY(v), a = Math.atan2(z, x);
        if (chicken) {
          const contour = 1 + Math.sin(a * 3 + 0.8) * 0.055 + Math.sin(a * 9) * 0.025;
          position.setXYZ(v, x * contour, py * 0.15 + Math.sin(x * 12 + z * 8) * 0.006, z * contour * 0.87);
        } else {
          const radius = Math.hypot(x, z);
          const contour = 1 + Math.sin(a * 13) * 0.009 + Math.sin(a * 5) * 0.007;
          position.setXYZ(v, x * contour, py + Math.cos(a * 11) * 0.004 * Math.min(1, radius), z * contour);
        }
        const vertical = Math.abs(g.attributes.normal.getY(v)) < 0.65;
        uv.setXY(v, vertical ? uv.getX(v) * 8 : x * 0.65 + 0.5,
          vertical ? py * 3 + 0.5 : z * 0.65 + 0.5);
      }
      uv.needsUpdate = true;
      g.computeVertexNormals();
      mesh(g, material(0xffffff, 0.82, chicken ? "crumb" : "patty"), patty);
      y += chicken ? 0.29 : 0.23;
      if (selected.has("cheese") || selected.has("swiss")) {
        cheese(layer(`cheese-${i}`, y + 0.014), 0, selected.has("swiss"), chicken ? "chicken" : "round");
        y += 0.025;
      }
    }
    if (selected.has("bacon")) { bacon(layer("bacon", y + 0.02), 0); y += 0.06; }
    if (selected.has("mushroom")) {
      const mushrooms = layer("mushroom", y + 0.025);
      for (let i = 0; i < 11; i++) {
        const radius = Math.sqrt((i + 0.5) / 11) * 0.72;
        const cap = sphere(mushrooms, Math.cos(i * 2.4) * radius, (i % 3) * 0.01, Math.sin(i * 2.4) * radius * 0.8,
          0.22 + (i % 3) * 0.015, 0x947251, [1, 0.25, 0.7], 0.75);
        cap.rotation.y = i * 1.7;
        cap.rotation.z = Math.sin(i) * 0.16;
      }
      y += 0.07;
    }
    for (const vegetableName of ["pepper", "zucchini"]) {
      if (!selected.has(vegetableName)) continue;
      const vegetables = layer(vegetableName, y + 0.025);
      for (let i = 0; i < 6; i++) {
        const x = Math.cos(i * 2.4) * 0.6, z = Math.sin(i * 2.4) * 0.5;
        if (vegetableName === "zucchini") {
          const slice = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 28), material(0x678447, 0.45), vegetables, x, i * 0.005, z);
          slice.rotation.z = Math.sin(i * 1.7) * 0.08;
        } else {
          const pepper = tube(vegetables, [[x - 0.19, 0, z - 0.12], [x - 0.15, 0.015, z + 0.17], [x + 0.16, 0.02, z + 0.19], [x + 0.2, 0, z - 0.08]], 0.055, 0xbf4c2c, 18, 0.45);
          pepper.rotation.y = i * 0.12;
        }
      }
      y += 0.065;
    }
    if (vegetable && (selected.has("cheese") || selected.has("swiss"))) {
      cheese(layer("cheese-0", y + 0.006), 0, selected.has("swiss"), "toast");
      y += 0.018;
    }
    if (selected.has("tomato")) { tomato(layer("tomato", y + 0.035), 0); y += 0.09; }
    if (selected.has("pickle")) { pickles(layer("pickle", y + 0.025), 0); y += 0.065; }
    if (selected.has("onion")) {
      const onions = layer("onion", y + 0.015);
      for (let i = 0; i < 3; i++) {
        const ring = mesh(new THREE.TorusGeometry(0.48 - i * 0.07, 0.032, 8, 40), material(0xe3cece, 0.58), onions, (i - 1) * 0.32, i * 0.014, (i % 2) * 0.15);
        ring.rotation.x = Math.PI / 2;
      }
      y += 0.06;
    }
    if (selected.has("lettuce")) { const lettuce = layer("lettuce", y + 0.005); leaf(lettuce, 0); leaf(lettuce, 0.025, 1.1, 1.02); y += 0.055; }
    if (selected.has("avocado")) {
      const avocado = layer("avocado", y + 0.035);
      for (let i = 0; i < 5; i++) sphere(avocado, (i - 2) * 0.27, i * 0.005, 0, 0.68, 0xa4b966, [0.23, 0.1, 1], 0.6);
      y += 0.09;
    }
    const top = layer("bread-top", y + (sandwich ? 0.125 : -0.015));
    if (sandwich) {
      mesh(roundedSlab(2.05, 1.65, 0.23, 0.16), material(breadColor, 0.72, "toast"), top);
      top.rotation.y = -0.04;
      grillMarks(top);
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
        const geometry = new THREE.LatheGeometry([
          new THREE.Vector2(0, -0.09), new THREE.Vector2(0.92, -0.09),
          new THREE.Vector2(1.015, -0.065), new THREE.Vector2(1.04, -0.015),
          new THREE.Vector2(1.025, 0.045), new THREE.Vector2(0.96, 0.083), new THREE.Vector2(0, 0.09),
        ], 80);
        const positions = geometry.attributes.position, uv = geometry.attributes.uv;
        for (let v = 0; v < positions.count; v++) {
          const x = positions.getX(v), z = positions.getZ(v), r = Math.hypot(x, z), a = Math.atan2(z, x);
          const contour = 1 + Math.sin(a * 5 + i) * 0.014 + Math.cos(a * 9 - i) * 0.008;
          positions.setXYZ(v, x * contour, positions.getY(v) + Math.sin(a * 4 + i) * 0.008 * r, z * contour);
          uv.setXY(v, x * 0.45 + 0.5, z * 0.45 + 0.5);
        }
        geometry.computeVertexNormals();
        const pancake = mesh(geometry, material(0xffffff, 0.75, "pancake"), cake, Math.sin(i * 2.1) * 0.035, 0, Math.cos(i * 2.1) * 0.025);
        pancake.rotation.y = i * 0.7;

      }
    }
    // Extruded toast includes a 0.035 bevel above its nominal half-height.
    const topSurface = 0.28 + (count - 1) * step + (frenchToast ? 0.135 : 0.098);
    let y = topSurface + 0.016;
    if (selected.has("syrup")) {
      const syrup = layer("syrup", y);
      sauce(syrup, 0, 0xa76021, frenchToast ? 0.76 : 0.9, frenchToast ? 0.8 : 1.04);
      if (!materialCache.has("maple-syrup")) {
        materialCache.set("maple-syrup", new THREE.MeshPhysicalMaterial({
          color: 0xa96722, roughness: 0.24, metalness: 0, specularIntensity: 0.45,
          transparent: true, opacity: 0.64, depthWrite: false,
          clearcoat: 0.12, clearcoatRoughness: 0.32,
        }));
      }
      syrup.traverse(object => {
        if (!object.isMesh) return;
        object.material = materialCache.get("maple-syrup");
        object.castShadow = false;
      });
      y += 0.025;
    }
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
    const lip = mesh(new THREE.TorusGeometry(0.598, 0.015, 12, 64), glass, cup, 0, 1.9, 0);
    lip.rotation.x = Math.PI / 2;
    cylinder(cup, 0.44, 0.065, 0.015, 0xb4b9b4, 0.16);
    const color = isSoda ? 0xc94e5c : isFloat ? 0x4b2b1c : item.id === "chocolate-shake" ? 0x88503c : item.id === "vanilla-malt" ? 0xf1d9ae : 0xeaaaaf;
    const liquid = layer("drink", 0.37);
    // Follow the inner glass wall instead of intersecting it with a straight cone.
    const liquidGeometry = new THREE.LatheGeometry([
      new THREE.Vector2(0, 0), new THREE.Vector2(0.35, 0),
      new THREE.Vector2(0.415, 0.88), new THREE.Vector2(0.546, 1.62),
      new THREE.Vector2(0, 1.62),
    ], 64);
    mesh(liquidGeometry, material(color, isSoda || isFloat ? 0.29 : 0.72), liquid);
    // Small bubbles collect at the meniscus of a poured drink.
    const bubbles = rng(127);
    for (let i = 0; i < (isSoda ? 34 : 18); i++) {
      const angle = bubbles() * Math.PI * 2, r = 0.46 + bubbles() * 0.055;
      sphere(liquid, Math.cos(angle) * r, 1.623, Math.sin(angle) * r,
        0.008 + bubbles() * 0.012, isFloat ? 0xa47c52 : isSoda ? 0xf2afb4 : 0xf1ddc5,
        [1, 0.55, 1], 0.5);
    }
    if (isSoda && selected.values.ice !== "none") {
      const ice = layer("ice", 1.98);
      if (!materialCache.has("ice")) materialCache.set("ice", new THREE.MeshPhysicalMaterial({ color: 0xe7f1ee, roughness: 0.15, transparent: true, opacity: 0.58, transmission: 0.15, thickness: 0.18, ior: 1.31, depthWrite: false }));
      for (let i = 0; i < (selected.values.ice === "light" ? 3 : 7); i++) {
        const cube = mesh(roundedSlab(0.24, 0.28, 0.22, 0.05), materialCache.get("ice"), ice, Math.cos(i * 2.4) * 0.31, Math.sin(i * 2) * 0.05, Math.sin(i * 2.4) * 0.3);
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
    if (selected.has("cherry")) cherry(layer("cherry", topY - 0.025), 0);
    if (Array.isArray(selected.values.toppings) && selected.values.toppings.includes("chocolate")) {
      const withCream = selected.has("whipped-cream");
      const drizzle = layer("chocolate", withCream ? topY - 0.7 : 2.005);
      for (let i = 0; i < 4; i++) {
        const z = -0.26 + i * 0.17, points = [];
        for (let j = 0; j <= 14; j++) {
          const x = -0.35 + j / 14 * 0.7, radius = Math.hypot(x, z);
          points.push([x, withCream ? Math.max(0.09, 0.62 * (1 - radius / 0.48)) : 0.008, z + Math.sin(j * 0.6 + i) * 0.018]);
        }
        tube(drizzle, points, 0.012, 0x4e291b, 22, 0.24);
      }
    }
    const straw = layer("straw", 1.63);
    straw.position.x = 0.3; straw.position.z = -0.18; straw.rotation.z = -0.2;
    cylinder(straw, 0.038, 1.55, 0.65, 0xfff7e7, 0.5);
    for (let i = 0; i < 9; i++) cylinder(straw, 0.039, 0.065, i * 0.16, 0xb62d38, 0.5);
    if (large) food.scale.set(1.1, 1.12, 1.1);
    targetHeight = large ? 1.58 : 1.4;
  }

  function buildBreakfast(selected) {
    const eggs = layer("eggs", 0.225);
    if (selected.has("scrambled")) {
      const random = rng(73);
      for (let i = 0; i < 19; i++) sphere(eggs, -0.35 + (random() - 0.5) * 0.85, random() * 0.09, (random() - 0.5) * 0.68, 0.18, 0xf0c95d, [1, 0.65, 0.8], 0.7);
    } else {
      for (let i = 0; i < 2; i++) {
        const white = sphere(eggs, -0.43, 0.018, (i - 0.5) * 0.69 - 0.04, 0.49, 0xffedcf, [1.12, 0.1, 0.86], 0.58);
        const p = white.geometry.attributes.position;
        for (let v = 0; v < p.count; v++) {
          const x = p.getX(v), z = p.getZ(v), a = Math.atan2(z, x);
          const spread = 1 + Math.sin(a * 5 + i) * 0.06 + Math.sin(a * 9) * 0.025;
          p.setXYZ(v, x * spread, p.getY(v), z * spread);
        }
        white.geometry.computeVertexNormals();
        const crispEdge = mesh(white.geometry.clone(), material(0xba8347, 0.79), eggs,
          white.position.x, 0.007, white.position.z);
        crispEdge.scale.set(1.17, 0.055, 0.9);
        sphere(eggs, -0.37, 0.076, (i - 0.5) * 0.69 - 0.04, 0.205, 0xeeb331, [1, 0.36, 1], 0.32);
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
    if (selected.has("potato")) potatoPile(layer("potato", 0.27), 0.18, 0.88);
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
    const tones = [0xf4d8a1, 0xe0b877, 0xffffff, 0xd5a56c];
    for (let i = 0; i < 15; i++) {
      const width = 0.15 + random() * 0.12, depth = 0.17 + random() * 0.13, height = 0.12 + random() * 0.07;
      const cube = mesh(roundedSlab(width, depth, height, 0.035), material(tones[i % tones.length], 0.82, "potato"), parent,
        x + (random() - 0.5) * 0.75, random() * 0.1, z + (random() - 0.5) * 0.35);
      cube.rotation.set((random() - 0.5) * 0.35, random() * Math.PI, (random() - 0.5) * 0.3);
      // Small browned contact patches break up the pale, uniform diced-potato surfaces.
      const patchGeometry = new THREE.CircleGeometry(width * 0.27, 13);
      patchGeometry.rotateX(-Math.PI / 2);
      const positions = patchGeometry.attributes.position;
      for (let v = 1; v < positions.count; v++) {
        const factor = 0.7 + random() * 0.5;
        positions.setXYZ(v, positions.getX(v) * factor, 0, positions.getZ(v) * factor);
      }
      const patch = mesh(patchGeometry, material(i % 3 ? 0xa86c31 : 0x81502c, 0.88), cube,
        0, height / 2 + 0.036, 0);
      patch.scale.z = 0.7 + random() * 0.5;
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
        const positions = fry.geometry.attributes.position;
        for (let v = 0; v < positions.count; v++) {
          const x = positions.getX(v), y = positions.getY(v), z = positions.getZ(v);
          positions.setXYZ(v, x * (0.93 + Math.cos(z * 5 + i) * 0.08), y + Math.sin(z * 4 + i) * 0.017, z);
        }
        fry.geometry.computeVertexNormals();
        fry.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3);
      }
    } else if (item.model === "pickles") {
      for (let i = 0; i < (selected.has("large") ? 10 : 7); i++) {
        const pickle = mesh(new THREE.CapsuleGeometry(0.13, 0.83, 4, 14), material(0xffffff, 0.9, "crumb"), pile, (random() - 0.5) * 1.2, random() * 0.24, (random() - 0.5) * 0.9);
        const angle = random() * Math.PI * 2;
        pickle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(angle), 0.15 + random() * 0.3, Math.sin(angle)).normalize());
      }
    } else {
      // A shallow sauce bed joins the pasta instead of exposing the empty bowl.
      sphere(pile, 0, -0.01, 0, 0.9, 0xd49b3b, [1, 0.14, 1], 0.3);
      for (let i = 0; i < (selected.has("large") ? 110 : 85); i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 0.87;
        const noodle = mesh(new THREE.TorusGeometry(0.11, 0.052, 7, 10, Math.PI * 1.3), material(i % 3 ? 0xe4a23c : 0xd99c38, 0.3), pile, Math.cos(angle) * radius, random() * 0.22, Math.sin(angle) * radius);
        noodle.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }
    if (selected.has("cheese")) {
      const topping = layer("cheese", selected.has("chili") ? 1.18 : 1.1);
      const drizzleRandom = rng(742);
      for (let i = 0; i < 7; i++) {
        const z = -0.52 + i * 0.16, tilt = (drizzleRandom() - 0.5) * 0.5;
        const start = -0.67 + drizzleRandom() * 0.16, end = 0.43 + drizzleRandom() * 0.26;
        tube(topping, [[start, -0.04, z - tilt], [-0.25, 0.055, z + 0.05], [0.16, 0.075, z - 0.035], [end, -0.06, z + tilt]],
          0.022 + drizzleRandom() * 0.012, 0xeab33c, 24, 0.4);
      }
    }
    if (selected.has("chili")) {
      const chili = layer("chili", 1.08);
      for (let i = 0; i < 11; i++) {
        const a = i * 2.4, r = 0.17 + random() * 0.35;
        sphere(chili, Math.cos(a) * r, -0.025 + random() * 0.025, Math.sin(a) * r, 0.24, 0x79402a, [1.1, 0.22, 0.9], 0.6);
      }
      for (let i = 0; i < 65; i++) {
        const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 0.56;
        const mince = mesh(new THREE.DodecahedronGeometry(0.035 + random() * 0.035, 1), material(i % 3 ? 0x6c3b24 : 0x854529, 0.65), chili,
          Math.cos(angle) * radius, 0.015 + random() * 0.06, Math.sin(angle) * radius);
        mince.scale.set(1.2, 0.6, 0.9);
        mince.rotation.set(random(), random() * 3, random());
      }
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
  function pieSlice(parent, y, color, height, kind = "") {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.65);
    shape.lineTo(Math.cos(Math.PI / 6) * 1.05, -0.65 + Math.sin(Math.PI / 6) * 1.05);
    shape.absarc(0, -0.65, 1.05, Math.PI / 6, Math.PI * 5 / 6, false);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelThickness: 0.024, bevelSize: 0.025, bevelSegments: 3, curveSegments: 28 });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -height / 2, 0);
    return mesh(geometry, material(color, kind ? 0.86 : 0.7, kind), parent, 0, y, 0);
  }
  function buildDessert(selected) {
    let y = 0.28;
    let scoopSurface = null;
    const random = rng(9041);
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
      const brownie = layer("brownie", 0.48);
      mesh(roundedSlab(1.45, 1.45, 0.3, 0.08), material(0x80513c, 0.94, "toast"), brownie);
      // Broken baked skin and exposed crumbs give the top a cakey, irregular edge.
      for (let i = 0; i < 65; i++) {
        const crumb = mesh(new THREE.DodecahedronGeometry(0.025 + random() * 0.035, 0),
          material(i % 3 ? 0x623c2b : 0x8b5739, 0.93), brownie,
          (random() - 0.5) * 1.38, 0.16 + random() * 0.015, (random() - 0.5) * 1.38);
        crumb.scale.y = 0.35;
        crumb.rotation.y = random() * Math.PI;
      }
      for (let i = 0; i < 6; i++) {
        const x = (i - 2.5) * 0.23, z = (random() - 0.5) * 0.65;
        tube(brownie, [[x - 0.12, 0.171, z - 0.23], [x + 0.04, 0.175, z - 0.08],
          [x - 0.025, 0.174, z + 0.1], [x + 0.13, 0.17, z + 0.25]], 0.005, 0x352018, 12, 0.95);
      }
      y = 0.7;
    } else {
      pieSlice(layer("crust", 0.29), 0, 0xffffff, 0.12, "crumb");
      const filling = layer("filling", 0.61);
      pieSlice(filling, 0, item.model === "cheesecake" ? 0xf2e1c5 : 0xc18b4c, 0.5);
      if (item.model === "pie") {
        // Broad, overlapping cut surfaces read as tender apple layers instead of beads.
        for (const [face, angle] of [Math.PI / 6, Math.PI * 5 / 6].entries()) {
          for (let row = 0; row < 5; row++) for (let column = 0; column < 3; column++) {
            const width = 0.31 + random() * 0.11, thickness = 0.045 + random() * 0.035;
            const shape = new THREE.Shape();
            shape.moveTo(-width / 2, -thickness * 0.3);
            shape.quadraticCurveTo(-width * 0.2, thickness * 0.75, width * 0.35, thickness * 0.4);
            shape.quadraticCurveTo(width * 0.62, 0, width * 0.42, -thickness * 0.4);
            shape.quadraticCurveTo(-width * 0.1, -thickness * 0.5, -width / 2, -thickness * 0.3);
            const r = 0.19 + column * 0.31 + (random() - 0.5) * 0.09;
            const outward = face ? -1 : 1;
            const apple = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true,
              bevelThickness: 0.007, bevelSize: 0.01, bevelSegments: 2, curveSegments: 8 }),
            material((row + column) % 3 ? 0xd6a264 : 0xc99754, 0.26), filling,
            Math.cos(angle) * r + Math.sin(angle) * outward * 0.015,
            -0.19 + row * 0.087 + (random() - 0.5) * 0.025,
            0.65 - Math.sin(angle) * r + Math.cos(angle) * outward * 0.015);
            apple.rotation.set(0, angle + (face ? Math.PI : 0), (random() - 0.5) * 0.16);
          }
        }
        const pastry = layer("pastry", 0.9);
        pieSlice(pastry, 0, 0xffffff, 0.07, "toast");
        for (let i = 0; i < 16; i++) {
          const angle = Math.PI / 6 + i / 15 * Math.PI * 2 / 3;
          const crimp = sphere(pastry, Math.cos(angle) * 1.035, 0.025,
            0.65 - Math.sin(angle) * 1.035, 0.08, 0xd4a167, [1, 0.65, 0.68], 0.86);
          crimp.rotation.y = -angle;
        }
        for (let i = 0; i < 3; i++) {
          const vent = mesh(roundedSlab(0.022, 0.19, 0.002, 0.009), material(0x83532c, 0.9), pastry,
            -0.25 + i * 0.25, 0.06, -0.08);
          vent.rotation.y = -0.3;
        }
      }
      // A few loose crumbs at the cut and the rim ground either slice on its plate.
      const crumbs = layer("cake-crumbs", 0.18);
      for (let i = 0; i < 22; i++) {
        const angle = random() * Math.PI * 2, radius = 0.75 + random() * 0.4;
        const crumb = mesh(new THREE.DodecahedronGeometry(0.012 + random() * 0.022, 0),
          material(0xc18d51, 0.93), crumbs, Math.cos(angle) * radius, 0.01, Math.sin(angle) * radius * 0.65);
        crumb.scale.y = 0.55;
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
        // Thin ribbons spread across the scoop, with meandering edges and tapered ends.
        const chocolate = material(0x4e281b, 0.22);
        chocolate.side = THREE.DoubleSide;
        for (let i = 0; i < 4; i++) {
          const offset = (i - 1.5) * 0.16, positions = [], indices = [];
          const start = -0.76 + random() * 0.28, end = 1.05 + random() * 0.45;
          const width = 0.022 + random() * 0.014;
          for (let step = 0; step <= 36; step++) {
            const t = step / 36, angle = start + t * (end - start);
            const spread = width * Math.min(1, Math.sqrt(Math.sin(Math.PI * t)) * 2.5)
              * (1 + Math.sin(t * 12 + i) * 0.2);
            for (const side of [-1, 1]) {
              const x = offset + Math.sin(t * 7 + i * 1.6) * 0.03 + spread * side;
              const extent = Math.sqrt(Math.max(0.001, scoopSurface.radius ** 2 - x ** 2));
              const py = Math.cos(angle) * extent, pz = Math.sin(angle) * extent;
              const latitude = py / scoopSurface.radius;
              const ridge = Math.sin(Math.atan2(pz, x) * 17 + latitude * 7) * 0.009 * Math.max(0, 1 - latitude * latitude);
              const scoopMark = Math.sin(x * 22 + py * 5) * Math.cos(pz * 19) * 0.007;
              const raised = 1 + (ridge + scoopMark + 0.008) / scoopSurface.radius;
              positions.push(x * raised, py * raised * scoopSurface.scaleY, (scoopSurface.z || 0) + pz * raised);
            }
            if (step < 36) {
              const v = step * 2;
              indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
            }
          }
          const ribbon = new THREE.BufferGeometry();
          ribbon.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
          ribbon.setIndex(indices);
          ribbon.computeVertexNormals();
          mesh(ribbon, chocolate, glaze);
        }
      } else sauce(layer("chocolate", y - 0.08), 0, 0x512b1d, 0.47);
    }
    if (selected.has("whipped-cream")) { whip(layer("whipped-cream", y), 0, 0.8); y += 0.49; }
    if (selected.has("cherry")) {
      const cherries = layer("cherry", y);
      if (item.model === "cheesecake") {
        // Connected compote with collapsed fruit pieces, rather than separate red marbles.
        for (let i = 0; i < 7; i++) {
          const x = Math.sin(i * 2.3) * 0.34, z = -0.06 + Math.cos(i * 2.3) * 0.19;
          sphere(cherries, x, -0.045, z, 0.19, 0x8d2230, [1.15, 0.1, 0.9], 0.22);
          const fruit = sphere(cherries, x, -0.005 + random() * 0.02, z, 0.115, 0xa72d35,
            [0.85 + random() * 0.25, 0.45 + random() * 0.14, 0.8], 0.24);
          fruit.rotation.y = random() * Math.PI;
        }
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
