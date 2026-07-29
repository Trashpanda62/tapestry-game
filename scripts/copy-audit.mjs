import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const copy = await readFile(join(root, "docs", "home-copy.md"), "utf8");
const ledger = await readFile(join(root, "docs", "claim-ledger.md"), "utf8");
for (const key of ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]) if (!copy.includes(`[${key}]`)) throw new Error(`[copy] missing ${key} citation.`);
if (!ledger.includes("working family farm") || !ledger.includes("RV: $270/night")) throw new Error("[copy] claim ledger baseline is incomplete.");
console.log("[copy] PASS: home narrative, first-visit primer, proof, teasers, and practical limits are ledger-keyed.");
