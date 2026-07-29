import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const selector = await readFile(join(root, "assets", "surface-selector.js"), "utf8");
const preview = await readFile(join(root, "surface-preview.html"), "utf8");
const production = await readFile(join(root, "dist", "index.html"), "utf8");
for (const axis of ["calendarLayout", "facetLayout", "quickviewStyle"]) if (!selector.includes(`${axis}:`)) throw new Error(`[surface-selector] missing ${axis}.`);
for (const value of ["month-grid", "week-strip", "list-days", "left-rail", "top-chips", "drawer-always", "modal", "side-panel"]) if (!selector.includes(value) || !preview.includes(value)) throw new Error(`[surface-selector] missing ${value}.`);
for (const token of ["noindex,nofollow", "tapestry-surface-preview:", "calendarLayout", "preset-switcher.js", "surface-selector.js", "prefers-reduced-motion"]) if (!preview.includes(token)) throw new Error(`[surface-selector] preview contract missing ${token}.`);
if (selector.includes("gamePresentation") || preview.includes("game-presentation")) throw new Error("[surface-selector] accepted game must not have a presentation axis.");
if (production.includes("surface-selector.js") || production.includes("Surface preview")) throw new Error("[surface-selector] preview leaked into production home.");
if (await access(join(root, "dist", "surface-preview.html")).then(() => true).catch(() => false)) throw new Error("[surface-selector] normal production build contains the preview.");
console.log("[surface-selector] PASS: accepted-game preview exposes only the calendar, facets, and quick-view axes; normal production stays selector-free.");
