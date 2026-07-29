import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const faq = (await readFile(join(root, "docs", "visit-faq.md"), "utf8")).toLowerCase();
const html = await readFile(join(root, "dist", "experiences.html"), "utf8");
for (const phrase of ["weather", "accessibility", "availability", "cancellation", "child-policy", "tapestryacres@gmail.com"]) if (!faq.includes(phrase)) throw new Error(`[faq] missing ${phrase} guard.`);
for (const phrase of ["Before you head to the farm", "How do I choose a date?", "How much time should I plan?", "What should I wear?", "What should I confirm before booking?", "(931) 823-3266"]) if (!html.includes(phrase)) throw new Error(`[faq] rendered visit guide is missing ${phrase}.`);
console.log("[faq] PASS: practical visit guide covers booking, timing, address, clothing, contact, and policy questions.");
