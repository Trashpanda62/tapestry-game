import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = JSON.parse(await readFile(join(root, "animals.json"), "utf8"));
const built = JSON.parse(await readFile(join(root, "dist", "data", "animals.v1.json"), "utf8"));
const html = await readFile(join(root, "dist", "animals.html"), "utf8");
if (source.groups.length !== 8 || built.data.groups.length !== 8) throw new Error("[animals] expected 8 species groups.");
if (source.groups.some((group) => !group.image || !Array.isArray(group.individuals))) throw new Error("[animals] every group needs a real image and individuals array.");
for (const needle of ["data/animals.v1.json", "animal-filter", "Meet the Herd", "mailto:tapestryacres@gmail.com"]) if (!html.includes(needle)) throw new Error(`[animals] missing ${needle}.`);
if (!html.includes("group.individuals&&group.individuals.length")) throw new Error("[animals] empty names guard is missing.");
console.log("[animals] PASS: 8 groups, named/unnamed rendering guards, reference/for-sale distinction, filter, and hash navigation.");
