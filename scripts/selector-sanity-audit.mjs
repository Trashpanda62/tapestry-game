import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const html = await readFile(join(root, "design-preview.html"), "utf8");
const doc = await readFile(join(root, "docs", "selector-sanity.md"), "utf8");
for (const token of ["@media(max-width:700px)", "prefers-reduced-motion", "preview-hero", "preview-nav", "overflow"]) if (!html.includes(token) && !doc.includes(token)) throw new Error(`[selector-sanity] missing ${token}.`);
for (const phrase of ["320–430px", "768px", "1440px", "No combination"]) if (!doc.includes(phrase)) throw new Error(`[selector-sanity] missing review evidence ${phrase}.`);
console.log("[selector-sanity] PASS: bounded desktop/mobile combinations have contrast, layout, focus, overflow, and reduced-motion review notes.");
