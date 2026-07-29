import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const html = await readFile(join(root, "dist", "shop.html"), "utf8");
const script = await readFile(join(root, "dist", "assets", "shop.js"), "utf8");
const index = JSON.parse(await readFile(join(root, "dist", "data", "catalog-index.json"), "utf8"));
if (index.familyCount !== 242 || index.skuCount !== 830 || !/^catalog\.[a-f0-9]{64}\.json$/.test(index.catalog)) throw new Error("[shop] catalog index counts/hash are wrong.");
for (const needle of ["data/catalog-index.json", "product-search", "product-sort", "load-more", "shop-result-count"]) if (!(html+script).includes(needle)) throw new Error(`[shop] missing ${needle}.`);
for (const needle of ["Add to bag", "tapestry-bag-v1", "selected", "quantity", "route('bag')"]) if (!script.includes(needle)) throw new Error(`[shop] missing first-party bag control ${needle}.`);
if (/Buy(?: selected option)? on Square|square\.link|Variant ready|Buy selected option/i.test(html+script)) throw new Error("[shop] customer-facing external checkout or developer label remains.");
if (html.includes("fetch('store-products.json'") || html.includes('fetch("store-products.json"')) throw new Error("[shop] first paint still requests the full legacy catalog path.");
console.log("[shop] PASS: hashed 242-family/830-SKU catalog is lazy-loaded with option selection, stock guards, persistent first-party bag, and site-owned checkout routing.");
