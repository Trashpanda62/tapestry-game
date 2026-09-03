import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const manifest = JSON.parse(await readFile(join(dist, "route-manifest.json"), "utf8"));
const redirects = await readFile(join(dist, "_redirects"), "utf8");
// /rv-admin is the farm's own availability editor: passcode-gated, noindex, and
// deliberately absent from the sitemap and from every nav. It is listed here
// because the route genuinely exists and this matrix is meant to be exhaustive —
// leaving it out would make the gate lie about what the bundle serves.
const expected = ["/s/tapestry-acres/", "/s/tapestry-acres/animals", "/s/tapestry-acres/experiences", "/s/tapestry-acres/book", "/s/tapestry-acres/herd", "/s/tapestry-acres/stay", "/s/tapestry-acres/shop", "/s/tapestry-acres/bag", "/s/tapestry-acres/checkout", "/s/tapestry-acres/404", "/s/tapestry-acres/thanks", "/s/tapestry-acres/rv-admin"];
if (JSON.stringify(manifest.routes.map(({ route }) => route)) !== JSON.stringify(expected)) throw new Error("[routes] canonical route matrix changed.");
for (const file of ["404.html", "thanks.html", "_redirects"]) await access(join(dist, file));
for (const file of manifest.routes.map(({ file }) => file)) {
  const html = await readFile(join(dist, file), "utf8");
  if (/(?:href|action)="(?!https?:|mailto:)[^"#]*\.html(?:["#?]|$)/i.test(html)) throw new Error(`[routes] ${file} leaks a .html internal URL.`);
}
if (!redirects.includes("/experiences.html /s/tapestry-acres/experiences 308!")) throw new Error("[routes] legacy redirect map is incomplete.");
console.log(`[routes] PASS: ${manifest.routes.length} canonical routes, legacy 308 map, branded 404/thanks.`);
