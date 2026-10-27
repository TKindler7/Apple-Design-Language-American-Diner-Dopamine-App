import { readFileSync, existsSync, mkdirSync, copyFileSync, cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS } from "../catalog.js";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const references = [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map((match) => match[1]).concat(ITEMS.map(item => item.image));
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const missing = references.filter((reference) => !existsSync(resolve(projectRoot, reference)));
if (missing.length) {
  console.error(`Missing site assets: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  const outputDir = resolve(projectRoot, "public");
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  for (const filename of ["index.html", "styles.css", "app.js", "cart.js", "catalog.js", "food-scene.js", "special.js"]) {
    copyFileSync(resolve(projectRoot, filename), resolve(outputDir, filename));
  }
  mkdirSync(resolve(outputDir, "assets"), { recursive: true });
  cpSync(resolve(projectRoot, "assets/food"), resolve(outputDir, "assets/food"), { recursive: true });
  copyFileSync(resolve(projectRoot, "assets/favicon.svg"), resolve(outputDir, "assets/favicon.svg"));
  mkdirSync(resolve(outputDir, "vendor"), { recursive: true });
  for (const filename of ["three.module.js", "three.core.js"]) {
    copyFileSync(resolve(projectRoot, "node_modules/three/build", filename), resolve(outputDir, "vendor", filename));
  }
  copyFileSync(resolve(projectRoot, "node_modules/three/LICENSE"), resolve(outputDir, "vendor/LICENSE.txt"));
  console.log(`Static site ready: ${references.length} local references resolved and public/ generated.`);
}
