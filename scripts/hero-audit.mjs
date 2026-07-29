import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = await readFile(join(root, "dist", "index.html"), "utf8");
for (const needle of ["assets/portfolio/walk-summer.webp", "/s/tapestry-acres/experiences", "/s/tapestry-acres/stay", "hero-trust"]) {
  if (!html.includes(needle)) throw new Error(`[hero] missing ${needle}.`);
}
if (!/<img[^>]+alt="[^"]+host[^\"]+guest/i.test(html)) throw new Error("[hero] host/guest alt proof is missing.");
console.log("[hero] PASS: host+guest proof hero, booking/stay CTAs, and trust line are in the first route shell.");
