import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = "C:/dev/tapestry-game";
const report = JSON.parse(await readFile(join(root, "dist", "data", "catalog-reconciliation.json"), "utf8"));
if (report.source.skuCount !== 830 || report.source.familyCount !== 242) throw new Error("[catalog-reconciliation] source counts changed.");
if (report.imported.skuCount !== 830 || report.imported.familyCount !== 242) throw new Error("[catalog-reconciliation] imported counts changed.");
if (!Array.isArray(report.drift?.missingWixFamilies) || !Array.isArray(report.drift?.missingImageSkus) || !Array.isArray(report.drift?.unresolvedVariantSkus)) throw new Error("[catalog-reconciliation] drift fields are incomplete.");
console.log(`[catalog-reconciliation] PASS: ${report.imported.familyCount} families / ${report.imported.skuCount} variants; status=${report.status}; drift is explicitly reported.`);
