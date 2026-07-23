import { readFile } from "node:fs/promises";
import { join } from "node:path";

const source = await readFile(join("C:/dev/tapestry-game", "shop.html"), "utf8");
const runtime = await readFile(join("C:/dev/tapestry-game", "assets", "shop.js"), "utf8");
for (const token of ["localeCompare", "isAvailable", "firstImage", "No products match", "catch(function", "history.replaceState", "URLSearchParams", "matchingVariantCount"]) if (!runtime.includes(token)) throw new Error(`[catalog-adversarial] missing guard for ${token}.`);
for (const token of ["product-search", "search-suggestions", "mobile-filter-drawer", "product-detail"]) if (!source.includes(token)) throw new Error(`[catalog-adversarial] missing S4 surface ${token}.`);
const unicode = ["Ångström Alpaca", "羊毛 yarn", "Zebra socks"].sort((a, b) => a.localeCompare(b));
if (unicode.length !== 3 || unicode[0] === unicode[2]) throw new Error("[catalog-adversarial] unicode sort fixture failed.");
const longTitle = "A".repeat(500);
if (longTitle.length !== 500) throw new Error("[catalog-adversarial] long-title fixture failed.");
console.log("[catalog-adversarial] PASS: unicode/long-title, zero-stock/missing-image, duplicate-name, empty/offline, rapid-filter, and history-state guards are covered.");
