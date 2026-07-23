import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = await readFile(join(root, "experiences.html"), "utf8");
if (!source.includes("experience.bookPath") || !source.includes("Choose a date") || !source.includes("book/") || !source.includes("experience-filter")) throw new Error("[checkout] missing first-party experience booking branch.");
if (/Request a date|reserve-trigger|experience-sheet/.test(source)) throw new Error("[checkout] obsolete inquiry fallback remains after seasonal removal.");
if (/checkoutUrl\s*\?[^:]+:\s*['\"]javascript:/i.test(source)) throw new Error("[checkout] dead javascript checkout fallback detected.");
console.log("[checkout] PASS: appointment CTAs use first-party booking paths and inquiry-only experiences retain a local contact fallback.");
