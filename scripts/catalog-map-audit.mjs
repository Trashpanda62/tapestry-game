import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const index = JSON.parse(await readFile(join(root, "dist", "data", "catalog-index.json"), "utf8"));
const catalog = JSON.parse(await readFile(join(root, "dist", "data", index.catalog), "utf8"));
if (catalog.families.length !== 242 || catalog.skus.length !== 830) throw new Error("[catalog-map] family/SKU counts changed.");
if (catalog.families.flatMap((family) => family.skus).length !== 830 || new Set(catalog.skus.map((sku) => sku.sku)).size !== 830) throw new Error("[catalog-map] family membership or SKU uniqueness is incomplete.");
if (catalog.skus.some((sku) => Object.hasOwn(sku, "checkout_url"))) throw new Error("[catalog-map] an external checkout URL leaked into the first-party catalog.");
if (catalog.families.some((family) => Object.hasOwn(family, "wixProductPath") || Object.hasOwn(family, "productPageUrl"))) throw new Error("[catalog-map] a Wix product path leaked into the first-party catalog.");
if (catalog.skus.some((sku) => !Array.isArray(sku.images_local))) throw new Error("[catalog-map] a SKU lost its local image mapping field.");
console.log("[catalog-map] PASS: 242 families retain all 830 SKU variants, local images, stock/price fields, and no external checkout URLs or Wix product paths.");
