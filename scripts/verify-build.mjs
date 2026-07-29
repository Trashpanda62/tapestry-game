import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifests = ["route-manifest.json", "asset-manifest.json", "data/manifest.v1.json", "data/catalog-index.json", "data/featured-products.json"];

function run(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

run("scripts/build.mjs");
const first = await Promise.all(manifests.map((file) => readFile(join(root, "dist", file))));
run("scripts/build.mjs");
const second = await Promise.all(manifests.map((file) => readFile(join(root, "dist", file))));
for (let index = 0; index < manifests.length; index += 1) {
  if (!first[index].equals(second[index])) throw new Error(`[verify] ${manifests[index]} changed between identical builds.`);
}
run("scripts/validate-build.mjs");
console.log("[verify] PASS: generated manifests and catalog data are byte-stable across two builds.");
