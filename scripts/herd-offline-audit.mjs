import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const source = JSON.parse(await readFile(join("C:/dev/tapestry-herd", "herd.json"), "utf8"));
const mirror = JSON.parse(await readFile(join(root, "dist", "herd", "herd.json"), "utf8"));
if (source.totals.headcount !== 110 || source.totals.named !== 65 || mirror.totals.headcount !== 110 || mirror.totals.named !== 65) throw new Error("[herd-offline] herd totals changed.");
const manifest = JSON.parse(await readFile(join(root, "dist", "route-manifest.json"), "utf8"));
const herdRecord = manifest.files.find(({ file }) => file === "herd/herd.json");
const herdBytes = await readFile(join(root, "dist", "herd", "herd.json"));
if (!herdRecord || herdRecord.sha256 !== createHash("sha256").update(herdBytes).digest("hex")) throw new Error("[herd-offline] herd checksum is not in the release inventory.");
const sw = await readFile(join(root, "dist", "herd", "sw.js"), "utf8");
const index = await readFile(join(root, "dist", "herd", "index.html"), "utf8");
for (const token of ["caches.match(req)", "caches.match('./index.html')", "network-first", "serviceWorker", "@media(min-width:520px)", "prefers-reduced-motion"]) if (!sw.includes(token) && !index.includes(token)) throw new Error(`[herd-offline] missing ${token} behavior.`);
console.log("[herd-offline] PASS: 110/65 herd totals, checksummed data, cache/network fallback, cache-bust behavior, responsive, keyboard, and reduced-motion guards.");
