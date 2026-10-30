import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";

const root = fileURLToPath(new URL("../assets/models/", import.meta.url));
export const MODEL_FAMILIES = ["burger-pilot", "savory", "sides", "sweet"];

// Read exported geometry bounds without a renderer or a browser. Node transforms
// are included so a joined mesh can never silently inflate or flatten the dish.
export function inspectGlb(filename) {
  const buffer = readFileSync(filename);
  if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2 || buffer.readUInt32LE(8) !== buffer.length) throw new Error(`Invalid GLB: ${filename}`);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + buffer.readUInt32LE(12)));
  if (gltf.buffers?.some(buffer => buffer.uri) || gltf.images?.some(image => image.uri)) throw new Error(`External resource in ${filename}`);
  const bounds = new Box3();
  let triangles = 0;
  function visit(index, parent) {
    const node = gltf.nodes[index];
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]), new Vector3().fromArray(node.scale ?? [1, 1, 1]));
    const world = new Matrix4().multiplyMatrices(parent, local);
    for (const primitive of gltf.meshes?.[node.mesh]?.primitives ?? []) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      if (!accessor.min || !accessor.max) throw new Error(`Missing geometry bounds in ${filename}`);
      bounds.union(new Box3(new Vector3().fromArray(accessor.min), new Vector3().fromArray(accessor.max)).applyMatrix4(world));
      triangles += (gltf.accessors[primitive.indices]?.count ?? accessor.count) / 3;
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  for (const index of gltf.scenes[gltf.scene ?? 0].nodes) visit(index, new Matrix4());
  const size = bounds.getSize(new Vector3());
  if (bounds.isEmpty() || ![size.x, size.y, size.z].every(value => Number.isFinite(value) && value > 0)) throw new Error(`Empty model ${filename}`);
  return { size: size.toArray(), triangles, bytes: buffer.length };
}

export function loadFoodLibrary() {
  const ingredients = {};
  for (const family of MODEL_FAMILIES) {
    const source = resolve(root, family, "manifest.json");
    if (!existsSync(source)) throw new Error(`The ${family} model library is not complete.`);
    const manifest = JSON.parse(readFileSync(source, "utf8"));
    for (const [key, config] of Object.entries(manifest.ingredients)) {
      if (ingredients[key]) throw new Error(`Duplicate model ${key}`);
      if (!/^\.\/[a-zA-Z0-9_-]+\.glb$/.test(config.url)) throw new Error(`Invalid source model ${key}`);
      const stats = inspectGlb(resolve(root, family, config.url));
      const factor = config.width / Math.max(stats.size[0], stats.size[2]);
      ingredients[key] = { ...config, url: `./${family}/${config.url.slice(2)}`, height: stats.size[1] * factor, bytes: stats.bytes, triangles: stats.triangles };
    }
  }
  return { version: 1, method: "Original authored geometry and chat-generated food textures", ingredients };
}
