import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function auditAssets(root, dist) {
  const manifest = JSON.parse(await readFile(join(dist, "asset-manifest.json"), "utf8"));
  const fail = (message) => { throw new Error(`[asset-audit] ${message}`); };
  const indexedAssets = new Map(manifest.assets.map((asset) => [asset.file, asset]));

  if (manifest.media?.schemaVersion !== 1 || !Array.isArray(manifest.media.images) || !Array.isArray(manifest.media.routeCriticalFonts)) {
    fail("missing production media metadata.");
  }

  for (const image of manifest.media.images) {
    if (!image.id || !image.source || !Number.isInteger(image.dimensions?.width) || !Number.isInteger(image.dimensions?.height) || !Number.isFinite(image.focal?.x) || !Number.isFinite(image.focal?.y) || image.focal.x < 0 || image.focal.x > 100 || image.focal.y < 0 || image.focal.y > 100) {
      fail(`${image.id || image.source || "image"}: missing focal metadata.`);
    }
    if (!Array.isArray(image.variants) || !image.variants.length || !Object.keys(image.srcset ?? {}).length || !Object.values(image.srcset).every((files) => Array.isArray(files) && files.length)) fail(`${image.id}: missing responsive srcset variants.`);
    for (const variant of image.variants) {
      if (!Number.isInteger(variant.width) || !Array.isArray(variant.files) || !variant.files.length) fail(`${image.id}: missing responsive output.`);
      for (const file of variant.files) {
        const copied = indexedAssets.get(file.file);
        if (!copied || copied.bytes !== file.bytes || copied.sha256 !== file.sha256) fail(`${file.file}: manifest does not match the packaged asset.`);
        if (!Number.isInteger(file.width) || !Number.isInteger(file.height) || file.width < 1 || file.height < 1) fail(`${file.file}: missing dimensions.`);
        if (file.maxBytes && file.bytes > file.maxBytes) fail(`${file.file}: ${file.bytes} bytes exceeds its ${file.maxBytes}-byte budget.`);
        if (image.kind === "accent" && file.bytes > 60000) fail(`${file.file}: accent exceeds the 60000-byte budget.`);
      }
    }
  }

  for (const font of manifest.media.routeCriticalFonts) {
    const copied = indexedAssets.get(font.file);
    if (!copied) fail(`${font.file}: route-critical font is missing.`);
    if (copied.bytes > 100000) fail(`${font.file}: route-critical font exceeds the 100000-byte budget.`);
  }

  return `[asset-audit] PASS: ${manifest.media.images.length} responsive image sets, ${manifest.media.routeCriticalFonts.length} route-critical fonts.`;
}

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await auditAssets(root, join(root, "dist")));
