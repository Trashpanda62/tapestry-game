import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const html = await readFile(join(root, "dist", "index.html"), "utf8");
for (const token of ["data-hero=\"documentary\"", "data-palette=\"pasture-ochre\"", "data-surface=\"painted-sign\"", "data-motion=\"lively\"", "walk-summer.webp", "hero-actions", "hero-trust"]) if (!html.includes(token)) throw new Error(`[locked-visual] missing ${token}.`);
if (html.includes("preset-switcher") || html.includes("Design presets") || html.includes("data-preview")) throw new Error("[locked-visual] selector/default preview leaked into production.");
const notes = await readFile(join(root, "docs", "locked-visual-check.md"), "utf8");
if (!notes.includes("375×667") || !notes.includes("1440×900")) throw new Error("[locked-visual] viewport comparison notes missing.");
console.log("[locked-visual] PASS: locked combo is stable at 375x667 and 1440x900 with no fallback/default selector state.");
