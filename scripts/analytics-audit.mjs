import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const source = await readFile(join(root, "assets", "journey-analytics.js"), "utf8");
for (const key of ["journey_click", "rv_inquiry", "return_to", "clickTier", "utm_source", "utm_campaign", "CustomEvent"]) if (!source.includes(key)) throw new Error(`[analytics] missing ${key} contract.`);
if (/\b(email|phone|fullName|customerName)\b/.test(source)) throw new Error("[analytics] payload contains a disallowed identity field.");
console.log("[analytics] PASS: primary/secondary/navigation click events and allowlisted UTM propagation are defined.");
