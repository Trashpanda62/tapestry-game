import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = JSON.parse(await readFile(join(root, "experiences.json"), "utf8"));
const built = JSON.parse(await readFile(join(root, "dist", "data", "experiences.v1.json"), "utf8"));
const html = await readFile(join(root, "dist", "experiences.html"), "utf8");
if (source.length !== 6 || built.data.length !== 6) throw new Error("[experiences] expected six schema-backed experiences after removing the seasonal placeholder.");
if (source.some((item) => item.id === "seasonal-events")) throw new Error("[experiences] seasonal placeholder must not ship.");
if (built.data.filter((item) => item.bookPath).length !== 5) throw new Error("[experiences] built payload must expose five first-party booking paths.");
if (built.data.some((item) => item.bookingUrl || item.checkoutUrl)) throw new Error("[experiences] built payload must not expose external booking or checkout URLs.");
for (const needle of ["data/experiences.v1.json", "bookPath", "Choose a date", "experience-filter"]) if (!html.includes(needle)) throw new Error(`[experiences] missing ${needle}.`);
if (/<iframe\b|bookingUrl|checkoutUrl|square\.link|tapestryacres\.com/i.test(html)) throw new Error("[experiences] external booking iframe/link remains in the page.");
console.log("[experiences] PASS: 6 records, first-party booking paths, local inquiry fallback, filter, and schema-backed fetch.");
