import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const familyKeyFor = (title) => {
  const key = String(title).trim().toLowerCase().replace(/\s+/g, " ");
  if (key.endsWith(" hand dyed baby alpaca yarn")) return "hand dyed baby alpaca yarn";
  if (key === "alpaca dryer ball") return "dryer balls";
  return key;
};

const compare = (left, right) => left.localeCompare(right, "en");
const featuredCount = 8;

const compact = (value) => String(value || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
const toFirstPartyProduct = ({ checkout_url: _checkoutUrl, ...product }) => product;

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

export async function generateCatalog(root, dist) {
  await mkdir(join(dist, "data"), { recursive: true });
  const products = JSON.parse(await readFile(join(root, "store-products.json"), "utf8"));
  const curated = JSON.parse(await readFile(join(root, "src", "featured-skus.json"), "utf8"));
  const wixProducts = JSON.parse(await readFile(join(root, "src", "wix-products-2026-06-23.json"), "utf8"));
  if (!Array.isArray(products) || products.length !== 830) fail(`expected 830 SKUs, found ${products.length}.`);
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
      const variants = skus.map((sku) => ({ sku, selections: selectionsForSku(sku, family.options) }));
      return { ...family, skus, variants };
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
