import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readWebpSize, shortEdge } from "../src/image-size.mjs";

const cleanCatalogText = (value) => String(value || "")
  .replace(/\bFushia\b/gi, "Fuchsia")
  .replace(/\bfushias\b/gi, "fuchsias")
  .replace(/\bweght\b/gi, "weight")
  .replace(/\bYargage\b/g, "Yardage")
  .replace(/yarnCascade/g, "yarn. Cascade")
  .replace(/AlpacaYardage/g, "Alpaca. Yardage")
  .replace(/([a-z0-9)][.!?])(?=[A-Z])/g, "$1 ")
  .replace(/([a-z0-9)])(?=(?:Yardage|Gauge):)/g, "$1. ")
  .replace(/perfect fitting Ribbing/gi, "perfect-fitting ribbing");

const canonicalOptionValue = (value) => cleanCatalogText(value)
  .replace(/\bSmalll\b/g, "Small")
  .replace(/^blue\/Purple$/, "Blue/Purple");

const familyKeyFor = (title) => {
  const key = cleanCatalogText(title).trim().toLowerCase().replace(/\s+/g, " ");
  if (key.endsWith(" hand dyed baby alpaca yarn")) return "hand dyed baby alpaca yarn";
  if (key === "alpaca dryer ball") return "dryer balls";
  return key;
};

const compare = (left, right) => left.localeCompare(right, "en");
const featuredCount = 8;

const compact = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
const toFirstPartyProduct = ({ checkout_url: _checkoutUrl, ...product }) => product;

function cleanPublicProduct(product) {
  return {
    ...product,
    title: cleanCatalogText(product.title),
    description: cleanCatalogText(product.description),
    category: cleanCatalogText(product.category),
    subcategory: product.subcategory == null ? null : cleanCatalogText(product.subcategory),
    extra_category: product.extra_category == null ? null : cleanCatalogText(product.extra_category),
  };
}

function normalizeFamilyOptions(options) {
  return options.map((option) => {
    const choices = new Map();
    for (const choice of option.choices || []) {
      const value = canonicalOptionValue(choice.value);
      const current = choices.get(value);
      choices.set(value, {
        ...choice,
        value,
        description: canonicalOptionValue(choice.description || choice.value),
        inStock: current ? current.inStock || choice.inStock : choice.inStock,
      });
    }
    return { ...option, choices: [...choices.values()] };
  });
}

function normalizeSelections(selections) {
  if (!selections) return selections;
  return Object.fromEntries(Object.entries(selections).map(([name, value]) => [name, canonicalOptionValue(value)]));
}

function optionCombinations(options) {
  return options.reduce((combinations, option) => combinations.flatMap((selection) => option.choices.map((choice) => ({ ...selection, [option.name]: choice.value }))), [{}]);
}

function selectionsForSku(sku, options) {
  if (!options.length) return {};
  const normalizedSku = compact(sku);
  const matches = optionCombinations(options)
    .map((selection) => ({ selection, token: compact(Object.values(selection).join("")) }))
    .filter(({ token }) => token && normalizedSku.endsWith(token));
  return matches.length === 1 ? matches[0].selection : null;
}

function fail(message) {
  throw new Error(`[catalog] ${message}`);
}

// A photo has to be at least half again as sharp as the current lead before it takes
// over the card. The importer's order is usually deliberate — the styled hero shot
// first, detail crops after — so reordering on any difference at all would trade a
// representative photo for a marginally larger one. Only a real gap earns the swap,
// and 122 of the 650 multi-image SKUs have one: a 100px thumbnail leading a set that
// also contains the 704px photograph.
const HERO_PROMOTION_RATIO = 1.5;

// Resolution alone is not enough to pick a hero. The Winter Alpaca Heavy Mini Crew Sock
// carries four 180x180 product shots and one 540x339 near-black size chart; ranking on
// size alone put the chart on the card. Product photography in this catalogue is square
// or portrait, so a candidate whose proportions disagree with the incumbent's is a
// banner, chart or size guide rather than a better photograph of the same thing.
const HERO_ASPECT_TOLERANCE = 1.2;

// Shape is still not enough on its own: the Craft Yarn Council weight symbol shipped
// with Brights Mix Luna Paints Yarn is a 266px SQUARE, so it passed the aspect check and
// took the card from a 100px photograph of the actual yarn. Line art is what has to be
// excluded, and colourfulness is what identifies it — see scripts/build-image-stats.py.
// Measured: the two known diagrams score 1.69 and 0.12, real photographs 8.07 upward.
const HERO_MIN_COLORFULNESS = 4;
const HERO_MIN_COLOR_RATIO = 0.4;

function comparableShape(candidate, lead) {
  if (!candidate.width || !candidate.height || !lead.width || !lead.height) return false;
  const ratio = (candidate.width / candidate.height) / (lead.width / lead.height);
  return ratio <= HERO_ASPECT_TOLERANCE && ratio >= 1 / HERO_ASPECT_TOLERANCE;
}

function looksPhotographic(candidate, lead) {
  // Unmeasured assets are never promoted. Failing closed leaves the hero as the store
  // ordered it, which is the safe outcome.
  if (!candidate.colorfulness) return false;
  if (candidate.colorfulness < HERO_MIN_COLORFULNESS) return false;
  return !lead.colorfulness || candidate.colorfulness >= lead.colorfulness * HERO_MIN_COLOR_RATIO;
}

async function measureImages(root, stats, product) {
  const paths = Array.isArray(product.images_local) ? product.images_local : [];
  const measured = [];
  for (const path of paths) {
    let size = null;
    try {
      size = readWebpSize(await readFile(join(root, path)));
    } catch {
      size = null;
    }
    const stat = stats[path] || {};
    measured.push({
      path,
      px: shortEdge(size),
      width: size ? size.width : 0,
      height: size ? size.height : 0,
      colorfulness: Number(stat.colorfulness) || 0
    });
  }
  if (!measured.length) return { ...product, images_px: [], heroPx: 0 };

  const lead = measured[0];
  const best = measured
    .filter((entry) => entry === lead || (comparableShape(entry, lead) && looksPhotographic(entry, lead)))
    .reduce((winner, entry) => (entry.px > winner.px ? entry : winner), lead);
  const ordered = best !== lead && lead.px > 0 && best.px >= lead.px * HERO_PROMOTION_RATIO
    ? [best, ...measured.filter((entry) => entry !== best)]
    : measured;

  return {
    ...product,
    images_local: ordered.map(({ path }) => path),
    images_px: ordered.map(({ px }) => px),
    heroPx: ordered[0].px
  };
}

export async function generateCatalog(root, dist) {
  await mkdir(join(dist, "data"), { recursive: true });
  const sourceProducts = JSON.parse(await readFile(join(root, "store-products.json"), "utf8"));
  const curated = JSON.parse(await readFile(join(root, "src", "featured-skus.json"), "utf8"));
  const wixProducts = JSON.parse(await readFile(join(root, "src", "wix-products-2026-06-23.json"), "utf8"));
  if (!Array.isArray(sourceProducts) || sourceProducts.length !== 830) fail(`expected 830 SKUs, found ${sourceProducts.length}.`);
  // Measured here rather than in the browser: the card has to choose a hero and a fit
  // mode before it paints, and an onload measurement would land a frame too late.
  const imageStats = JSON.parse(await readFile(join(root, "src", "image-stats.json"), "utf8"));
  const products = (await Promise.all(sourceProducts.map((product) => measureImages(root, imageStats, product)))).map(cleanPublicProduct);
  if (!Array.isArray(curated)) fail("featured-skus.json must be an array.");
  if (!Array.isArray(wixProducts) || wixProducts.length !== 242) fail("expected 242 Wix product records with option metadata.");
  const bySku = new Map(products.map((product) => [product.sku, product]));
  if (bySku.size !== products.length) fail("catalog contains duplicate SKU values.");

  const selected = [];
  const selectedSkus = new Set();
  for (const sku of curated) {
    const product = bySku.get(sku);
    if (product && !selectedSkus.has(sku)) {
      selected.push(product);
      selectedSkus.add(sku);
    }
    if (selected.length === featuredCount) break;
  }
  for (const product of [...products].sort((left, right) => compare(left.sku, right.sku))) {
    if (selected.length === featuredCount) break;
    if (!selectedSkus.has(product.sku)) {
      selected.push(product);
      selectedSkus.add(product.sku);
    }
  }
  if (selected.length !== featuredCount) fail(`could not select ${featuredCount} featured products.`);

  const wixByFamilyKey = new Map();
  for (const product of wixProducts) {
    const key = familyKeyFor(product.name);
    wixByFamilyKey.set(key, [...(wixByFamilyKey.get(key) || []), product]);
  }
  const familyMap = new Map();
  for (const product of products) {
    const key = familyKeyFor(product.title);
    const wixRecords = wixByFamilyKey.get(key) || [];
    if (!familyMap.has(key)) {
      const optionMap = new Map();
      for (const wix of wixRecords) for (const option of wix.productOptions || []) {
        if (!option.name) continue;
        const choices = optionMap.get(option.name) || new Map();
        for (const choice of option.choices || []) if (choice.visible !== false && choice.value) {
          const current = choices.get(choice.value);
          choices.set(choice.value, { value: choice.value, description: choice.description || choice.value, inStock: current ? current.inStock || choice.inStock !== false : choice.inStock !== false });
        }
        optionMap.set(option.name, choices);
      }
      const options = [...optionMap].map(([name, choices]) => ({ name, choices: [...choices.values()] })).filter((option) => option.choices.length);
      const wix = wixRecords[0] || {};
      familyMap.set(key, {
        familyId: `family-${createHash("sha1").update(key).digest("hex").slice(0, 12)}`,
        title: product.title,
        category: product.category,
        skus: [],
        manageVariants: wix.manageVariants === true,
        options,
        wixProductIds: wixRecords.map(({ id }) => id)
      });
    }
    familyMap.get(key).skus.push(product.sku);
  }
  const families = [...familyMap.values()]
    .map((family) => {
      const skus = family.skus.sort(compare);
      const variants = skus.map((sku) => ({ sku, selections: normalizeSelections(selectionsForSku(sku, family.options)) }));
      return { ...family, options: normalizeFamilyOptions(family.options), skus, variants };
    })
    .sort((left, right) => compare(left.familyId, right.familyId));
  if (families.length !== 242) fail(`expected 242 product families, found ${families.length}.`);
  const facets = Object.fromEntries([...new Set(products.map(({ category }) => category))].sort(compare).map((category) => {
    const familyIds = families.filter((family) => family.category === category).map(({ familyId }) => familyId);
    return [category, {
      familyCount: familyIds.length,
      skuCount: products.filter((product) => product.category === category).length,
      familyIds
    }];
  }));
  const sourceFamilyKeys = [...new Set(products.map((product) => familyKeyFor(product.title)))].sort(compare);
  const wixFamilyKeys = [...new Set(wixProducts.map((product) => familyKeyFor(product.name)))].sort(compare);
  const sourceFamilySet = new Set(sourceFamilyKeys);
  const wixFamilySet = new Set(wixFamilyKeys);
  const missingWixFamilies = sourceFamilyKeys.filter((key) => !wixFamilySet.has(key));
  const orphanWixFamilies = wixFamilyKeys.filter((key) => !sourceFamilySet.has(key));
  const missingImageSkus = products.filter((product) => !Array.isArray(product.images_local) || product.images_local.length === 0).map(({ sku }) => sku).sort(compare);
  const invalidPriceSkus = products.filter((product) => !Number.isFinite(product.price) || product.price <= 0).map(({ sku }) => sku).sort(compare);
  const invalidQuantitySkus = products.filter((product) => !Number.isInteger(product.qty) || product.qty < 0).map(({ sku }) => sku).sort(compare);
  const unresolvedVariantSkus = families.flatMap((family) => family.variants.filter((variant) => variant.selections === null).map(({ sku }) => sku)).sort(compare);
  const reconciliation = {
    schemaVersion: 1,
    source: { skuCount: products.length, familyCount: sourceFamilyKeys.length, wixRecordCount: wixProducts.length, wixFamilyCount: wixFamilyKeys.length },
    imported: { skuCount: products.length, familyCount: families.length },
    drift: { missingWixFamilies, orphanWixFamilies, missingImageSkus, invalidPriceSkus, invalidQuantitySkus, unresolvedVariantSkus },
    status: missingWixFamilies.length || orphanWixFamilies.length || missingImageSkus.length || invalidPriceSkus.length || invalidQuantitySkus.length || unresolvedVariantSkus.length ? "drift_detected" : "pass",
    policy: "Drift is reported for review; the immutable source snapshot and imported catalog are not mutated."
  };
  await writeFile(join(dist, "data", "catalog-reconciliation.json"), `${JSON.stringify(reconciliation, null, 2)}\n`);
  const catalog = { schemaVersion: 1, skuCount: products.length, familyCount: families.length, families, skus: products.map(toFirstPartyProduct) };
  const catalogBytes = Buffer.from(`${JSON.stringify(catalog)}\n`);
  const hash = createHash("sha256").update(catalogBytes).digest("hex");
  const catalogName = `catalog.${hash}.json`;
  const facetsName = `catalog-facets.${hash}.json`;
  await writeFile(join(dist, "data", catalogName), catalogBytes);
  await writeFile(join(dist, "data", facetsName), `${JSON.stringify({ schemaVersion: 1, catalogSha256: hash, skuCount: products.length, familyCount: families.length, categories: facets }, null, 2)}\n`);
  await writeFile(join(dist, "data", "catalog-index.json"), `${JSON.stringify({ schemaVersion: 1, sha256: hash, skuCount: products.length, familyCount: families.length, catalog: catalogName, facets: facetsName }, null, 2)}\n`);
  await writeFile(join(dist, "data", "featured-products.json"), `${JSON.stringify({ schemaVersion: 1, curatedSkus: curated, fallback: "Use catalog SKUs in ascending order when a curated SKU is absent; preserve the curated order for every SKU that exists.", fallbackUsed: selected.some((product) => !curated.includes(product.sku)), products: selected.map(toFirstPartyProduct) }, null, 2)}\n`);
  return [catalogName, facetsName, "catalog-index.json", "featured-products.json", "catalog-reconciliation.json"].map((name) => `data/${name}`);
}
