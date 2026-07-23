import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalBasePath, tenantUrl } from "../src/base-path.mjs";
import { contentSchemaVersion } from "./build-content-pack.mjs";
import { validateInputs } from "./validate-inputs.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const configFile = JSON.parse(await readFile(join(root, "src", "build-config.json"), "utf8"));
const config = { ...configFile, publicOrigin: process.env.TAPESTRY_PUBLIC_ORIGIN || configFile.publicOrigin };
const dist = join(root, "dist");

async function listOutput(directory, relativePath = "") {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  const files = [];
  for (const entry of entries) {
    const next = join(relativePath, entry.name);
    if (entry.isDirectory()) files.push(...await listOutput(join(directory, entry.name), next));
    else if (entry.isFile()) files.push(next.replaceAll("\\", "/"));
  }
  return files;
}

await validateInputs(root, config);
try {
  await access(dist);
} catch {
  throw new Error("[validate] dist is missing; run npm run build first.");
}

const inventory = JSON.parse(await readFile(join(dist, "route-manifest.json"), "utf8"));
const assets = JSON.parse(await readFile(join(dist, "asset-manifest.json"), "utf8"));
const contentManifest = JSON.parse(await readFile(join(dist, "data", "manifest.v1.json"), "utf8"));
if (inventory.basePath !== canonicalBasePath || assets.basePath !== canonicalBasePath || inventory.publicOrigin !== config.publicOrigin || assets.publicOrigin !== config.publicOrigin) {
  throw new Error("[validate] manifests have an unexpected base path.");
}

const expectedRoutes = config.routes.map(({ source, path }) => ({ file: source, route: tenantUrl(path) }));
if (JSON.stringify(inventory.routes) !== JSON.stringify(expectedRoutes)) {
  throw new Error("[validate] route inventory does not match the configured routes.");
}

for (const { source, path } of config.routes) {
  if (path === "/" || path === "/herd") continue;
  const alias = join(path.replace(/^\//, ""), "index.html");
  const [sourceBytes, aliasBytes] = await Promise.all([readFile(join(dist, source)), readFile(join(dist, alias))]);
  if (!sourceBytes.equals(aliasBytes)) throw new Error(`[validate] canonical route alias does not match ${source}: ${alias}`);
}

for (const record of inventory.files) {
  const bytes = await readFile(join(dist, record.file));
  if (record.bytes !== bytes.byteLength || record.sha256 !== createHash("sha256").update(bytes).digest("hex")) {
    throw new Error(`[validate] inventory hash mismatch: ${record.file}`);
  }
}

const expectedAssets = inventory.files.filter(({ file }) => config.assetDirectories.some((directory) => file.startsWith(`${directory}/`)));
if (JSON.stringify(assets.assets) !== JSON.stringify(expectedAssets)) {
  throw new Error("[validate] copied-asset manifest does not match the file inventory.");
}

if (contentManifest.schemaVersion !== contentSchemaVersion) throw new Error("[validate] content pack schema version is unexpected.");
for (const [file, expectedHash] of Object.entries(contentManifest.inputs)) {
  const source = await readFile(join(root, file));
  const actualHash = createHash("sha256").update(source).digest("hex");
  if (actualHash !== expectedHash) throw new Error(`[validate] content pack input hash mismatch: ${file}`);
}
for (const { file, sha256 } of contentManifest.artifacts) {
  const body = await readFile(join(dist, file));
  if (createHash("sha256").update(body).digest("hex") !== sha256) throw new Error(`[validate] content pack artifact hash mismatch: ${file}`);
}

const catalogIndex = JSON.parse(await readFile(join(dist, "data", "catalog-index.json"), "utf8"));
const catalogBytes = await readFile(join(dist, "data", catalogIndex.catalog));
const catalog = JSON.parse(catalogBytes);
const facets = JSON.parse(await readFile(join(dist, "data", catalogIndex.facets), "utf8"));
const featured = JSON.parse(await readFile(join(dist, "data", "featured-products.json"), "utf8"));
if (catalogIndex.sha256 !== createHash("sha256").update(catalogBytes).digest("hex")) {
  throw new Error("[validate] catalog index hash does not match its catalog payload.");
}
if (catalog.familyCount !== 242 || catalog.skuCount !== 830 || catalog.families.length !== 242 || catalog.skus.length !== 830) {
  throw new Error("[validate] catalog counts must remain 242 families and 830 SKUs.");
}
if (catalog.families.flatMap(({ skus }) => skus).length !== 830 || new Set(catalog.skus.map(({ sku }) => sku)).size !== 830) {
  throw new Error("[validate] catalog family and SKU identities are incomplete.");
}
if (catalog.skus.some((sku) => Object.hasOwn(sku, "checkout_url") || !Array.isArray(sku.images_local)) || catalog.families.some((family) => Object.hasOwn(family, "wixProductPath") || Object.hasOwn(family, "productPageUrl")) || featured.products.some((product) => Object.hasOwn(product, "checkout_url") || !Array.isArray(product.images_local)) || facets.catalogSha256 !== catalogIndex.sha256 || !Object.keys(facets.categories).length || featured.products.length !== 8) {
  throw new Error("[validate] generated catalog ownership fields, facets, or featured products are incomplete.");
}

const actualFiles = (await listOutput(dist)).sort((a, b) => a.localeCompare(b));
const expectedFiles = [...new Set([...inventory.files.map(({ file }) => file), ...contentManifest.artifacts.map(({ file }) => file), "data/manifest.v1.json", "asset-manifest.json", "route-manifest.json"])]
  .sort((a, b) => a.localeCompare(b));
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error("[validate] dist contains files missing from the deterministic inventory.");
}

console.log(`[validate] PASS: ${inventory.routes.length} routes, ${inventory.files.length} files, ${assets.assets.length} copied assets.`);
