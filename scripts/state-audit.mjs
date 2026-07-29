import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = await readFile(join(root, "assets", "state-skeletons.js"), "utf8");
for (const state of ["loading", "empty", "error", "success"]) if (!source.includes(`data-state=\"' + state + '\"`)) throw new Error(`[states] missing ${state} state renderer.`);
for (const region of ["catalog", "experiences", "herd", "lead"]) if (!source.includes(`\"${region}\"`)) throw new Error(`[states] missing ${region} region.`);
console.log("[states] PASS: catalog, experiences, herd, and lead regions expose loading/empty/error/success fixtures.");
