import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname);

test("catalog build keeps the first-party family, SKU, image, and facet contract", async () => {
  const build = spawnSync(process.execPath, ["scripts/build.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr || build.stdout);

  const data = join(root, "dist", "data");
  const index = JSON.parse(await readFile(join(data, "catalog-index.json"), "utf8"));
  const bytes = await readFile(join(data, index.catalog));
  const catalog = JSON.parse(bytes);
  const facets = JSON.parse(await readFile(join(data, index.facets), "utf8"));
  const featured = JSON.parse(await readFile(join(data, "featured-products.json"), "utf8"));

  assert.equal(index.sha256, createHash("sha256").update(bytes).digest("hex"));
  assert.equal(catalog.familyCount, 242);
  assert.equal(catalog.skuCount, 830);
  assert.equal(catalog.families.length, 242);
  assert.equal(catalog.skus.length, 830);
  assert.equal(catalog.families.flatMap(({ skus }) => skus).length, 830);
  assert.equal(new Set(catalog.skus.map(({ sku }) => sku)).size, 830);
  assert.ok(catalog.skus.every((sku) => !Object.hasOwn(sku, "checkout_url")));
  assert.ok(catalog.families.every((family) => !Object.hasOwn(family, "wixProductPath") && !Object.hasOwn(family, "productPageUrl")));
  assert.ok(catalog.skus.every((sku) => Array.isArray(sku.images_local)));
  assert.equal(facets.catalogSha256, index.sha256);
  assert.ok(Object.keys(facets.categories).length > 0);
  assert.equal(featured.products.length, 8);
  assert.ok(featured.products.every((product) => !Object.hasOwn(product, "checkout_url") && Array.isArray(product.images_local)));
});
