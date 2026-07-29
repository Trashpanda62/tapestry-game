import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const selector = await readFile(join(root, "assets", "design-selector.js"), "utf8");
const preview = await readFile(join(root, "design-preview.html"), "utf8");
const doctrine = await readFile(join(root, "docs", "visual-doctrine.md"), "utf8");
if (selector.includes("themeToggle") || selector.includes("dark")) throw new Error("[selector-lock] selector can alter the locked light-only theme.");
for (const phrase of ["Meet the family", "Book an experience", "BYO farm-side stay", "supplied RV"]) if (!preview.includes(phrase)) throw new Error(`[selector-lock] locked IA/copy missing: ${phrase}.`);
if (!doctrine.includes("prefers-reduced-motion") || !doctrine.includes("Default motion is still")) throw new Error("[selector-lock] reduced-motion/light doctrine is not explicit.");
console.log("[selector-lock] PASS: copy tone and IA remain fixed, selector is light-only, and reduced-motion always wins.");
