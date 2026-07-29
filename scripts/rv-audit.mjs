import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = await readFile(join(root, "dist", "rv-rentals.html"), "utf8");
for (const phrase of ["$270", "10%", "50%", "$500", "$400", "$4/mile", "__lead", "byo", "supplied-rv"]) if (!html.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`[rv] missing ${phrase} fact or lead marker.`);
for (const stale of ["$220", "$80", "$300"]) if (html.includes(stale)) throw new Error(`[rv] stale value remains: ${stale}.`);
console.log("[rv] PASS: BYO/supplied-RV choice hub, current rates/deposit facts, and Obscura lead action are present; stale values absent.");
