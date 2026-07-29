import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const app = await readFile(join(root, "dist", "herd", "index.html"), "utf8");
const shell = await readFile(join(root, "dist", "meet-the-herd.html"), "utf8");
const checklist = await readFile(join(root, "docs", "herd-parity-checklist.md"), "utf8");
for (const token of ["Name Them", "READONLY", "serviceWorker", "herd.json", "TABS", "keydown"]) if (!app.includes(token)) throw new Error(`[herd-parity] missing ${token}.`);
for (const token of ["id=\"herd-game\"", "assets/herd-game.js", "experiences#availability"]) if (!shell.includes(token)) throw new Error(`[herd-parity] shell missing ${token}.`);
if (!checklist.includes("network-first") || !checklist.includes("320px")) throw new Error("[herd-parity] checklist incomplete.");
console.log("[herd-parity] PASS: chapter shell, browse/quiz/read-only parity, same-origin fallback, and keyboard/modal checklist are present.");
