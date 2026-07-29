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
if (!sw.includes("herd-shell-v11-obscura")) throw new Error("[herd] service-worker cache namespace was not busted.");
const sourceStatus = (await import("node:child_process")).execFileSync("git", ["-C", "C:/dev/tapestry-herd", "status", "--short"], { encoding: "utf8" });
if (!sourceStatus.includes(" M index.html") || !sourceStatus.includes(" M sw.js")) throw new Error("[herd] source dirt was not preserved.");
console.log("[herd] PASS: read-only herd mirror copied with checksums, same-origin scope, cache bust, and source dirt preserved.");
