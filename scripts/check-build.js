import { readFileSync, existsSync, mkdirSync, copyFileSync, cpSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const references = [...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map((match) => match[1]);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const missing = references.filter((reference) => !existsSync(resolve(projectRoot, reference)));
if (missing.length) {
  console.error(`Missing site assets: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  const outputDir = resolve(projectRoot, "public");
  mkdirSync(outputDir, { recursive: true });
  for (const filename of ["index.html", "styles.css", "app.js", "cart.js"]) {
    copyFileSync(resolve(projectRoot, filename), resolve(outputDir, filename));
  }
  cpSync(resolve(projectRoot, "assets"), resolve(outputDir, "assets"), { recursive: true });
  console.log(`Static site ready: ${references.length} local references resolved and public/ generated.`);
}
