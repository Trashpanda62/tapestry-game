/**
 * Regenerates `animals-pool.json` — the Farm Steward card pool — from the
 * verified herd export at C:/dev/tapestry-herd/herd.json.
 *
 * Every named individual in the export becomes exactly one card. Nothing is
 * invented: names, species, facts, and photos come straight from the export.
 * The export embeds photos as base64 thumbs, so the generator decodes each
 * animal's best thumb into a real image file under assets/herd/ and points
 * the card at it; animals without a usable photo fall back to deterministic
 * species-level farm photography already in this repo.
 *
 * Run: node scripts/build-animal-pool.mjs
 */
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFact, isClueEligible, normalizeSpecies } from "./herd-fact.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const herdExportPath = "C:/dev/tapestry-herd/herd.json";

/** Species → home pasture (ids must exist in src/farm-steward.v1.json). */
export const speciesPasture = {
  "Alpaca": "alpaca-meadow",
  "Highland cattle": "highland-fold",
  "Belted Galloway × Jersey": "highland-fold",
  "Goat": "goat-knoll",
  "Pig": "pig-pasture",
  "Mule": "farmyard"
};

/**
 * Species-level art pools. Per-animal photos are not available in the herd
 * export, so cards rotate deterministically through real farm photography of
 * the right species. Pools are kept species-distinct so cross-species lineup
 * cards never share identical art; the Highland/Galloway overlap is the one
 * intentional look-alike pair.
 */
export const speciesArt = {
  "Alpaca": ["assets/portfolio/alpaca-face.webp", "assets/bg/meadow2.webp"],
  "Highland cattle": ["assets/farm/highland-cow-goldenhour.webp", "assets/farm/highland-calf-closeup.webp", "assets/bg/highland.webp"],
  "Belted Galloway × Jersey": ["assets/bg/highland2.webp"],
  "Goat": ["assets/farm/nigerian-dwarf-goats-barn.webp", "assets/bg/goats.webp"],
  "Pig": ["assets/farm/kunekune-pigs-pasture.webp", "assets/cards/piglet.jpg"],
  "Mule": ["assets/bg/meadow.webp"]
};

function hashId(id) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return hash;
}

const mimeExtensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const minPhotoBytes = 2000;

/** Decode the animal's largest usable embedded thumb into assets/herd/<id>.<ext>. */
async function extractPhoto(individual) {
  const thumbs = (Array.isArray(individual.photos) ? individual.photos : [])
    .map((photo) => String(photo?.thumb || ""))
    .filter((thumb) => thumb.startsWith("data:image/"))
    .sort((a, b) => b.length - a.length);
  for (const thumb of thumbs) {
    const match = thumb.match(/^data:(image\/[a-z+]+);base64,(.+)$/s);
    if (!match || !mimeExtensions[match[1]]) continue;
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length < minPhotoBytes) continue;
    const file = `assets/herd/${individual.id}.${mimeExtensions[match[1]]}`;
    await writeFile(join(root, file), bytes);
    return file;
  }
  return null;
}

export async function buildAnimalPool() {
  const herd = JSON.parse(await readFile(herdExportPath, "utf8"));
  await mkdir(join(root, "assets", "herd"), { recursive: true });
  const seen = new Set();
  const animals = [];
  for (const individual of herd.individuals) {
    const species = normalizeSpecies(individual.species);
    const pastureId = speciesPasture[species];
    const artPool = speciesArt[species];
    if (!pastureId || !artPool) throw new Error(`[pool] no pasture/art mapping for species "${species}" (${individual.id})`);
    if (seen.has(individual.id)) throw new Error(`[pool] duplicate herd id ${individual.id}`);
    seen.add(individual.id);
    const fact = deriveFact(individual.notes);
    if (!fact) throw new Error(`[pool] empty verified fact for ${individual.id}`);
    const art = artPool[hashId(individual.id) % artPool.length];
    await lstat(join(root, art));
    animals.push({
      id: individual.id,
      name: String(individual.name || individual.id).trim(),
      species,
      sex: individual.sex || "unknown",
      pastureId,
      photo: await extractPhoto(individual),
      art,
      fact,
      clueEligible: isClueEligible(fact)
    });
  }
  animals.sort((a, b) => a.id.localeCompare(b.id));
  return {
    schemaVersion: "1.0.0",
    source: {
      herdExport: herdExportPath,
      herdUpdated: herd.updated || null,
      generatedBy: "scripts/build-animal-pool.mjs",
      note: "Named individuals only. `photo` is the animal's own picture decoded from the herd export (null when the export has none); `art` is the species-level fallback."
    },
    herdTotals: {
      headcount: herd.totals?.headcount ?? null,
      named: herd.totals?.named ?? null,
      pooled: animals.length,
      withOwnPhoto: animals.filter((animal) => animal.photo).length
    },
    animals
  };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const pool = await buildAnimalPool();
  await writeFile(join(root, "animals-pool.json"), `${JSON.stringify(pool, null, 2)}\n`);
  console.log(`[pool] wrote animals-pool.json with ${pool.animals.length} of ${pool.herdTotals.named} named animals (herd headcount ${pool.herdTotals.headcount}).`);
}
