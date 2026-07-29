import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const selector = await readFile(join(root, "assets", "design-selector.js"), "utf8");
const preview = await readFile(join(root, "design-preview.html"), "utf8");
const production = await readFile(join(root, "dist", "index.html"), "utf8");
for (const axis of ["hero", "palette", "typography", "surface", "illustration", "density", "motion", "nav"]) if (!selector.includes(`${axis}:`)) throw new Error(`[selector] missing axis ${axis}.`);
if (!selector.includes("preview=1") || !selector.includes("dataset.preview") || !selector.includes("useHash: true") || !selector.includes("keepPanel: true")) throw new Error("[selector] preview/hash/panel contract missing.");
if (!preview.includes('noindex,nofollow') || !preview.includes("preset-switcher.js") || !preview.includes("design-selector.js")) throw new Error("[selector] preview wiring or noindex guard missing.");
if (production.includes("preset-switcher.js") || production.includes("Design presets")) throw new Error("[selector] selector panel leaked into production home.");
if (await (await import("node:fs/promises")).access(join(root, "dist", "design-preview.html")).then(() => true).catch(() => false)) throw new Error("[selector] unpublished preview is still in dist.");
console.log("[selector] PASS: unlisted noindex preview exposes bounded production axes with hash/persistence; production has no selector panel.");
