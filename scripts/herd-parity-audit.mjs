import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1").replace(/\/$/, "");
const app = await readFile(join(root, "dist", "herd", "index.html"), "utf8");
const shell = await readFile(join(root, "dist", "meet-the-herd.html"), "utf8");
const checklist = await readFile(join(root, "docs", "herd-parity-checklist.md"), "utf8");
for (const token of ["Name Them", "READONLY", "serviceWorker", "herd.json", "TABS", "keydown"]) if (!app.includes(token)) throw new Error(`[herd-parity] missing ${token}.`);
// Third token was "experiences#availability" — a link to an id that does not exist on
// experiences.html, so it dumped the player at the top of the wrong page. The gate was
// pinning the bug. Assert the real availability surface instead.
for (const token of ["id=\"herd-game\"", "/s/tapestry-acres/book"]) if (!shell.includes(token)) throw new Error(`[herd-parity] shell missing ${token}.`);
if (!/assets\/herd-game(?:\.[a-f0-9]{12})?\.js/.test(shell)) throw new Error('[herd-parity] shell missing the content-addressed herd game runtime.');
if (!checklist.includes("network-first") || !checklist.includes("320px")) throw new Error("[herd-parity] checklist incomplete.");
console.log("[herd-parity] PASS: chapter shell, browse/quiz/read-only parity, same-origin fallback, and keyboard/modal checklist are present.");
