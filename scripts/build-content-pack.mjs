import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generateCatalog } from "./generate-catalog.mjs";

export const contentSchemaVersion = "1.0.0";

function fail(file, field, message) {
  throw new Error(`[content] ${file}:${field}: ${message}`);
}

function text(file, field, value, { min = 1, max = 2000 } = {}) {
  if (typeof value !== "string") fail(file, field, "must be a string.");
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) fail(file, field, `must be ${min}-${max} characters.`);
  return normalized;
}

function optionalText(file, field, value, options) {
  if (value === null || value === undefined) return null;
  return text(file, field, value, options);
}

function integer(file, field, value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) fail(file, field, `must be an integer from ${min} to ${max}.`);
  return value;
}

function money(file, field, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100000 || Math.abs(Math.round(value * 100) - value * 100) > 1e-8) {
    fail(file, field, "must be a non-negative price with at most two decimal places.");
  }
  return value;
}

function url(file, field, value, { optional = false, hosts = [] } = {}) {
  if (optional && value === "") return null;
  const normalized = text(file, field, value, { max: 2048 });
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    fail(file, field, "must be an absolute URL.");
  }
  if (parsed.protocol !== "https:" || (hosts.length && !hosts.includes(parsed.hostname))) {
    fail(file, field, "must use an approved HTTPS destination.");
  }
  return parsed.toString();
}

async function imagePath(root, file, field, value) {
  const normalized = text(file, field, value, { max: 512 });
  if (!normalized.startsWith("assets/") || normalized.includes("\\") || normalized.split("/").includes("..")) {
    fail(file, field, "must be a local assets/ image path.");
  }
  try {
    if (!(await lstat(join(root, normalized))).isFile()) fail(file, field, "references a missing image file.");
  } catch (error) {
    if (error.message.startsWith("[content]")) throw error;
    fail(file, field, "references a missing image file.");
  }
  return normalized;
}

function object(file, field, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(file, field, "must be an object.");
  return value;
}

function array(file, field, value, { min = 0, max = 10000 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(file, field, `must be an array with ${min}-${max} items.`);
  return value;
}

async function normalizeExperiences(root, data) {
  const file = "experiences.json";
  return Promise.all(array(file, "$", data, { min: 1, max: 100 }).map(async (record, index) => {
    object(file, `[${index}]`, record);
    const id = text(file, `[${index}].id`, record.id, { max: 96 });
    return {
      id,
      name: text(file, `[${index}].name`, record.name, { max: 160 }),
      blurb: text(file, `[${index}].blurb`, record.blurb, { max: 400 }),
      longDesc: text(file, `[${index}].longDesc`, record.longDesc, { max: 3000 }),
      price: text(file, `[${index}].price`, record.price, { max: 64 }),
      cadence: text(file, `[${index}].cadence`, record.cadence, { max: 160 }),
      image: await imagePath(root, file, `[${index}].image`, record.image),
      category: text(file, `[${index}].category`, record.category, { max: 64 }),
      // Published experience cards stay inside the tenant-owned booking flow.
      // Farm Shopping Experience remains inquiry-only by policy.
      bookPath: id === "farm-shopping-experience" ? null : `book/${encodeURIComponent(id)}`
    };
  }));
}

async function normalizeAnimals(root, data) {
  const file = "animals.json";
  object(file, "$", data);
  const groups = await Promise.all(array(file, ".groups", data.groups, { min: 1, max: 100 }).map(async (group, index) => {
    object(file, `.groups[${index}]`, group);
    const individuals = array(file, `.groups[${index}].individuals`, group.individuals, { max: 500 })
      .map((name, member) => text(file, `.groups[${index}].individuals[${member}]`, name, { max: 160 }));
    return {
      species: text(file, `.groups[${index}].species`, group.species, { max: 160 }),
      blurb: text(file, `.groups[${index}].blurb`, group.blurb, { max: 1500 }),
      image: await imagePath(root, file, `.groups[${index}].image`, group.image),
      imageAlt: optionalText(file, `.groups[${index}].imageAlt`, group.imageAlt, { max: 300 }),
      individuals,
      unnamedCount: group.unnamedCount === undefined ? null : integer(file, `.groups[${index}].unnamedCount`, group.unnamedCount),
      unnamedNote: optionalText(file, `.groups[${index}].unnamedNote`, group.unnamedNote, { max: 500 })
    };
  }));
  const forSale = array(file, ".forSale", data.forSale, { max: 100 }).map((item, index) => {
    object(file, `.forSale[${index}]`, item);
    return {
      name: text(file, `.forSale[${index}].name`, item.name, { max: 160 }),
      detail: text(file, `.forSale[${index}].detail`, item.detail, { max: 500 }),
      cta: text(file, `.forSale[${index}].cta`, item.cta, { max: 160 })
    };
  });
  return { groups, forSale };
}

async function normalizeFarmSteward(root, data, herd) {
  const file = "src/farm-steward.v1.json";
  object(file, "$", data);
  object(file, ".source", data.source);
  const herdById = new Map(array(file, ".herdExport.individuals", herd?.individuals, { min: 1, max: 500 }).map((animal) => [animal.id, animal]));
  const pastures = await Promise.all(array(file, ".pastures", data.pastures, { min: 1, max: 20 }).map(async (pasture, index) => {
    object(file, `.pastures[${index}]`, pasture);
    const species = array(file, `.pastures[${index}].species`, pasture.species, { min: 1, max: 12 }).map((value, speciesIndex) => text(file, `.pastures[${index}].species[${speciesIndex}]`, value, { max: 160 }));
    return { id: text(file, `.pastures[${index}].id`, pasture.id, { max: 96 }), label: text(file, `.pastures[${index}].label`, pasture.label, { max: 160 }), species, fallbackArt: await imagePath(root, file, `.pastures[${index}].fallbackArt`, pasture.fallbackArt) };
  }));
  const pastureIds = new Set(pastures.map((pasture) => pasture.id));
  const animalCards = await Promise.all(array(file, ".animalCards", data.animalCards, { min: 1, max: 100 }).map(async (card, index) => {
    object(file, `.animalCards[${index}]`, card);
    const source = herdById.get(card.id);
    if (!source) fail(file, `.animalCards[${index}].id`, `does not exist in the verified herd export: ${card.id}`);
    if (!pastureIds.has(card.pastureId)) fail(file, `.animalCards[${index}].pastureId`, `unknown pasture: ${card.pastureId}`);
    const sourceFact = String(source.notes || "").split("[[")[0].trim();
    if (!sourceFact || card.verifiedFact !== sourceFact) fail(file, `.animalCards[${index}].verifiedFact`, `must exactly match the verified herd note for ${card.id}`);
    return { id: source.id, pastureId: card.pastureId, photo: card.photo === null ? null : await imagePath(root, file, `.animalCards[${index}].photo`, card.photo), fallbackArt: await imagePath(root, file, `.animalCards[${index}].fallbackArt`, card.fallbackArt), verifiedFact: sourceFact };
  }));
  const careItems = array(file, ".careItems", data.careItems, { min: 1, max: 20 }).map((item, index) => {
    object(file, `.careItems[${index}]`, item);
    return { id: text(file, `.careItems[${index}].id`, item.id, { max: 96 }), label: text(file, `.careItems[${index}].label`, item.label, { max: 160 }), kind: text(file, `.careItems[${index}].kind`, item.kind, { max: 32 }), appliesTo: text(file, `.careItems[${index}].appliesTo`, item.appliesTo, { max: 32 }), points: integer(file, `.careItems[${index}].points`, item.points, { min: 0, max: 100 }) };
  });
  object(file, ".session", data.session);
  return { source: { herdExport: text(file, ".source.herdExport", data.source.herdExport, { max: 512 }), updated: text(file, ".source.updated", data.source.updated, { max: 32 }), mode: text(file, ".source.mode", data.source.mode, { max: 160 }) }, pastures, animalCards, careItems, session: { schemaVersion: integer(file, ".session.schemaVersion", data.session.schemaVersion, { min: 1, max: 10 }), storageKey: text(file, ".session.storageKey", data.session.storageKey, { max: 160 }), roundTasks: integer(file, ".session.roundTasks", data.session.roundTasks, { min: 1, max: 10 }), maxStreak: integer(file, ".session.maxStreak", data.session.maxStreak, { min: 1, max: 20 }), scorePerCorrect: integer(file, ".session.scorePerCorrect", data.session.scorePerCorrect, { min: 0, max: 100 }), reducedMotionSafe: data.session.reducedMotionSafe === true, keyboardSafe: data.session.keyboardSafe === true, touchSafe: data.session.touchSafe === true } };
}

async function normalizeProducts(root, data) {
  const file = "store-products.json";
  return Promise.all(array(file, "$", data, { min: 1, max: 10000 }).map(async (product, index) => {
    object(file, `[${index}]`, product);
    const imagesLocal = await Promise.all(array(file, `[${index}].images_local`, product.images_local, { max: 20 })
      .map((path, image) => imagePath(root, file, `[${index}].images_local[${image}]`, path)));
    if (product.images !== null && product.images !== undefined) array(file, `[${index}].images`, product.images, { max: 20 });
    return {
      sku: text(file, `[${index}].sku`, product.sku, { max: 200 }),
      title: text(file, `[${index}].title`, product.title, { max: 400 }),
      description: text(file, `[${index}].description`, product.description, { max: 8000 }),
      price: money(file, `[${index}].price`, product.price),
      category: text(file, `[${index}].category`, product.category, { max: 160 }),
      subcategory: optionalText(file, `[${index}].subcategory`, product.subcategory, { max: 160 }),
      extraCategory: optionalText(file, `[${index}].extra_category`, product.extra_category, { max: 160 }),
      quantity: integer(file, `[${index}].qty`, product.qty, { max: 1000000 }),
      images: imagesLocal
    };
  }));
}

function requireFact(file, html, field, expected) {
  if (!html.includes(expected)) fail(file, field, `must match the current published fact: ${expected}`);
}

function normalizeRvFacts(html) {
  const file = "rv-rentals.html";
  const facts = {
    nightlyRate: 270,
    weeklyDiscountPercent: 10,
    reservationDepositPercent: 50,
    balanceDueHoursBeforeCheckIn: 24,
    incidentalDeposit: 500,
    deliveryBasePrice: 400,
    includedDeliveryMiles: 50,
    deliveryOveragePerMile: 4,
    petsAllowed: true,
    towelsIncludedOnFarm: true,
    deliveredTowelAddOn: 25,
    propaneIncluded: false,
    currentPastureHerd: "Alpacas",
    fleetIds: ["max-1", "max-2", "max-3", "max-4", "max-5", "max-6"]
  };
  for (const [field, expected] of [
    ["nightlyRate", "$270/night"],
    ["weeklyDiscountPercent", "10% off weekly (7+ nights)"],
    ["reservationDepositPercent", "50% deposit to reserve"],
    ["balanceDueHoursBeforeCheckIn", "balance is due 24 hours before check-in"],
    ["incidentalDeposit", "refundable $500 incidental"],
    ["deliveryPricing", "Delivery $400 (first 50 mi), $4/mile beyond."],
    ["petsAllowed", "pets are welcome."],
    ["towels", "towels included for on-farm stays ($25 add-on for deliveries); propane is not included."],
    ["currentPastureHerd", "var farmFieldNow='Alpacas';"]
  ]) requireFact(file, html, field, expected);
  for (const id of facts.fleetIds) requireFact(file, html, `fleetIds.${id}`, `id:'${id}'`);
  return facts;
}

function normalizeContact(html) {
  const file = "index.html";
  const match = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i);
  if (!match) fail(file, "contact", "missing LocalBusiness JSON-LD.");
  let localBusiness;
  try {
    localBusiness = JSON.parse(match[1]);
  } catch (error) {
    fail(file, "contact", `invalid LocalBusiness JSON-LD (${error.message}).`);
  }
  object(file, "contact", localBusiness);
  const address = object(file, "contact.address", localBusiness.address);
  const contact = {
    name: text(file, "contact.name", localBusiness.name, { max: 160 }),
    telephone: text(file, "contact.telephone", localBusiness.telephone, { max: 40 }),
    email: text(file, "contact.email", localBusiness.email, { max: 320 }),
    address: {
      streetAddress: text(file, "contact.address.streetAddress", address.streetAddress, { max: 160 }),
      addressLocality: text(file, "contact.address.addressLocality", address.addressLocality, { max: 100 }),
      addressRegion: text(file, "contact.address.addressRegion", address.addressRegion, { max: 10 }),
      addressCountry: text(file, "contact.address.addressCountry", address.addressCountry, { max: 10 })
    }
  };
  const expected = { name: "Tapestry Acres", telephone: "(931) 823-3266", email: "tapestryacres@gmail.com", address: { streetAddress: "396 Taylor Crossroads Rd", addressLocality: "Monroe", addressRegion: "TN", addressCountry: "US" } };
  if (JSON.stringify(contact) !== JSON.stringify(expected)) fail(file, "contact", "must match the shared current NAP.");
  return contact;
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseJson(file, source) {
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(file, "$", `invalid JSON (${error.message}).`);
  }
}

export async function buildContentPack(root, dist) {
  const inputPaths = ["experiences.json", "animals.json", "store-products.json", "rv-rentals.html", "index.html", "src/featured-skus.json", "src/wix-products-2026-06-23.json", "src/farm-steward.v1.json"];
  const raw = Object.fromEntries(await Promise.all(inputPaths.map(async (file) => [file, await readFile(join(root, file), "utf8")] )));
  const herd = parseJson("C:/dev/tapestry-herd/herd.json", await readFile("C:/dev/tapestry-herd/herd.json", "utf8"));
  const [experiences, animals, storeProducts] = await Promise.all([
    normalizeExperiences(root, parseJson("experiences.json", raw["experiences.json"])),
    normalizeAnimals(root, parseJson("animals.json", raw["animals.json"])),
    normalizeProducts(root, parseJson("store-products.json", raw["store-products.json"]))
  ]);
  const farmSteward = await normalizeFarmSteward(root, parseJson("src/farm-steward.v1.json", raw["src/farm-steward.v1.json"]), herd);
  const rvFacts = normalizeRvFacts(raw["rv-rentals.html"]);
  const contact = normalizeContact(raw["index.html"]);
  const output = join(dist, "data");
  await mkdir(output, { recursive: true });
  const artifacts = {
    "experiences.v1.json": experiences,
    "animals.v1.json": animals,
    "store-products.v1.json": storeProducts,
    "farm-steward.v1.json": farmSteward,
    "rv-facts.v1.json": rvFacts,
    "contact.v1.json": contact
  };
  const entries = [];
  for (const [file, value] of Object.entries(artifacts)) {
    const body = serialize({ schemaVersion: contentSchemaVersion, data: value });
    await writeFile(join(output, file), body);
    entries.push({ file: `data/${file}`, sha256: createHash("sha256").update(body).digest("hex") });
  }
  for (const file of await generateCatalog(root, dist)) {
    const body = await readFile(join(dist, file));
    entries.push({ file, sha256: createHash("sha256").update(body).digest("hex") });
  }
  const manifest = {
    schemaVersion: contentSchemaVersion,
    inputs: Object.fromEntries(inputPaths.map((file) => [file, createHash("sha256").update(raw[file]).digest("hex")])),
    artifacts: entries
  };
  await writeFile(join(output, "manifest.v1.json"), serialize(manifest));
  return { manifest, files: [...entries.map(({ file }) => file), "data/manifest.v1.json"] };
}
