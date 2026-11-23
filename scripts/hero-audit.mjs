import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = await readFile(join(root, "dist", "index.html"), "utf8");
// 2026-11-23 pivot: the hero leads with the farm shop (alpaca goods + freeze dried), not stays.
for (const needle of ["assets/farm-shop/hero-1125.webp", "/s/tapestry-acres/shop", "/s/tapestry-acres/freeze-dried", "hero-trust"]) {
  if (!html.includes(needle)) throw new Error(`[hero] missing ${needle}.`);
}
const hero = html.match(/<section class="hero home-hero"[\s\S]*?<\/section>/)?.[0] || "";
if (!/<img[^>]+alt="[^"]*alpaca[^"]*"/i.test(hero)) throw new Error("[hero] alpaca photo alt text is missing.");
if (!/<h1[^>]*>[^<]*alpaca[^<]*freeze dried/i.test(hero)) throw new Error("[hero] headline must name alpaca goods and freeze dried treats.");
console.log("[hero] PASS: farm-shop hero (alpaca photo, shop and freeze dried CTAs, trust line) is in the first route shell.");
