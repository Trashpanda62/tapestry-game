import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const attrs = ["data-hero=\"documentary\"", "data-palette=\"pasture-ochre\"", "data-typography=\"sturdy-slab\"", "data-surface=\"painted-sign\"", "data-illustration=\"accent\"", "data-density=\"comfortable\"", "data-motion=\"lively\"", "data-nav=\"rail\"", "data-calendar-layout=\"month-grid\"", "data-facet-layout=\"left-rail\"", "data-quickview-style=\"modal\""];
const files = ["index.html", "animals.html", "experiences.html", "meet-the-herd.html", "rv-rentals.html", "shop.html", "404.html", "thanks.html"];
for (const file of files) {
  const html = await readFile(join(root, "dist", file), "utf8");
  if (!attrs.every((attr) => html.includes(attr))) throw new Error(`[design-lock] ${file} is missing a locked root attribute.`);
  if (html.includes("preset-switcher") || html.includes("Design presets") || html.includes("LOCKED COMBO")) throw new Error(`[design-lock] selector code leaked into ${file}.`);
}
for (const file of ["preset-switcher.js", "preset-switcher.css", "design-selector.js"]) {
  await access(join(root, "dist", "assets", file)).then(() => { throw new Error(`[design-lock] unpublished selector asset shipped: ${file}.`); }).catch((error) => { if (error.code !== "ENOENT") throw error; });
}
await access(join(root, "design-preview.html"));
console.log("[design-lock] PASS: exact Steve combo is baked into all production routes; selector panel/assets are stripped and preview source retained.");
