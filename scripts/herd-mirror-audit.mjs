import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const mirrored = ["index.html", "herd.json", "icon.svg", "manifest.webmanifest", "sw.js", ".nojekyll"];
for (const file of mirrored) {
  const source = await readFile(join("C:/dev/tapestry-herd", file));
  const target = await readFile(join(root, "dist", "herd", file));
  if (file !== "index.html" && file !== "sw.js" && !source.equals(target)) throw new Error(`[herd] mirror drift: ${file}`);
}
const index = await readFile(join(root, "dist", "herd", "index.html"), "utf8");
const sw = await readFile(join(root, "dist", "herd", "sw.js"), "utf8");
if (!index.includes("/s/tapestry-acres/herd/sw.js") || !index.includes("/s/tapestry-acres/herd") || index.includes("github.io")) throw new Error("[herd] base/service-worker scope is not same-origin Obscura.");
if (!sw.includes("herd-shell-v12-obscura")) throw new Error("[herd] service-worker cache namespace was not busted.");
if (!/<main id="view"><\/main>/.test(index)) throw new Error("[herd] main landmark missing.");
if (!/for="q">Search the herd/.test(index) || !/aria-pressed=/.test(index)) throw new Error("[herd] search or selection semantics missing.");
if (!/<button type="button" class="tcard open"/.test(index)) throw new Error("[herd] naming cards must be keyboard buttons.");
console.log("[herd] PASS: read-only herd mirror copied with checksums, same-origin scope, cache bust, and interaction semantics.");
