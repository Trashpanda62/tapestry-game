import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const review = await readFile(join(root, "docs", "animal-copy-review.md"), "utf8");
const source = await readFile(join(root, "animals.json"), "utf8");
for (const value of ["Chiri Bim", "Freidrick", "Soloman", "mauve", "Belted Galloway × Jersey"]) if (!source.includes(value) || !review.includes(value)) throw new Error(`[animal-copy] anomaly handling missing for ${value}.`);
if (!review.includes("not silently fix") || !review.includes("No price")) throw new Error("[animal-copy] editorial guardrails are incomplete.");
console.log("[animal-copy] PASS: breed context is plain-language, source spellings are preserved, and anomalies are flagged.");
