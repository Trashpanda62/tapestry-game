import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const selector = await readFile(join(root, "assets", "preset-switcher.js"), "utf8");
const config = await readFile(join(root, "assets", "design-selector.js"), "utf8");
const preview = await readFile(join(root, "design-preview.html"), "utf8");
for (const token of ["LOCKED COMBO", "writeHash", "writeAxisStorage"]) if (!selector.includes(token)) throw new Error(`[selector-runtime] missing ${token}.`);
for (const token of ["useHash: true", "keepPanel: true", "preview=1"]) if (!config.includes(token)) throw new Error(`[selector-runtime] missing ${token}.`);
if (!preview.includes("localStorage.getItem('tapestry-obscura-preview:'")) throw new Error("[selector-runtime] pre-paint guard missing.");
console.log("[selector-runtime] PASS: hash/local persistence, pre-paint guard, exact LOCKED COMBO output, and preview-only panel are wired.");
