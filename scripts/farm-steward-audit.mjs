import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { deriveFact, normalizeSpecies } from "./herd-fact.mjs";

const root = new URL("../", import.meta.url);
const steward = JSON.parse(await readFile(new URL("src/farm-steward.v1.json", root), "utf8"));
const pool = JSON.parse(await readFile(new URL("animals-pool.json", root), "utf8"));
const herd = JSON.parse(await readFile(new URL("file:///C:/dev/tapestry-herd/herd.json"), "utf8"));
const herdById = new Map(herd.individuals.map((animal) => [animal.id, animal]));
const pastureIds = new Set(steward.pastures.map((pasture) => pasture.id));
const pastureSpecies = new Map(steward.pastures.map((pasture) => [pasture.id, new Set(pasture.species)]));
const featherSpecies = ["Chicken", "Runner duck", "Turkey"];

assert.equal(steward.schemaVersion, "2.0.0");
assert.equal(steward.source.mode, "game-only; not a care guide");
assert.equal(steward.source.animalPool, "animals-pool.json");
assert.equal(steward.session.roundTasks, 5, "a round is five steward tasks");
assert.equal(steward.session.dailyStreak, true);
assert.equal(steward.session.reducedMotionSafe, true);
assert.equal(steward.session.keyboardSafe, true);
assert.equal(steward.session.touchSafe, true);

for (const pasture of steward.pastures) {
  assert.ok(pasture.id && pasture.label && pasture.species.length > 0);
  await access(new URL(`../${pasture.fallbackArt}`, import.meta.url));
}

// Task variety: the five task types exist and each stays species-appropriate.
const taskIds = steward.taskTypes.map((task) => task.id);
assert.deepEqual([...taskIds].sort(), ["feed", "herd-move", "shear", "vet", "water"], "task roster must cover feed/water/vet/shear/herd-move");
assert.equal(new Set(steward.taskTypes.map((task) => task.icon)).size, steward.taskTypes.length, "each task type needs a distinct icon");
assert.equal(new Set(steward.taskTypes.map((task) => task.wording)).size, steward.taskTypes.length, "each task type needs distinct wording");
const shear = steward.taskTypes.find((task) => task.id === "shear");
assert.deepEqual(shear.species, ["Alpaca"], "shearing targets fiber animals only");
for (const task of steward.taskTypes) {
  if (task.species === "any") continue;
  for (const feathered of featherSpecies) assert.ok(!task.species.includes(feathered) || task.id !== "shear", `no shearing ${feathered}`);
}

// Difficulty ramp: lineups and look-alike quotas grow while timers tighten.
const rounds = steward.difficulty.rounds;
assert.ok(rounds.length >= 3, "need a real ramp");
rounds.forEach((row, index) => {
  if (index === 0) return;
  const prev = rounds[index - 1];
  assert.ok(row.timerSeconds <= prev.timerSeconds, "timers must tighten");
  assert.ok(row.lineupSize >= prev.lineupSize, "lineups must grow");
  assert.ok(row.sameSpeciesDistractors >= prev.sameSpeciesDistractors, "look-alike quota must grow");
  assert.ok(row.clueTasks >= prev.clueTasks, "clue pressure must grow");
});
const first = rounds[0];
const last = rounds[rounds.length - 1];
assert.ok(last.timerSeconds < first.timerSeconds && last.sameSpeciesDistractors > first.sameSpeciesDistractors, "the ramp must actually ramp");

// Full pool: every named animal in the verified herd export, nothing invented.
assert.equal(pool.animals.length, herd.individuals.length, "pool must carry every named herd animal");
const pooledIds = new Set();
for (const card of pool.animals) {
  const source = herdById.get(card.id);
  assert.ok(source, `pool animal missing from herd export: ${card.id}`);
  assert.ok(!pooledIds.has(card.id), `duplicate pool id ${card.id}`);
  pooledIds.add(card.id);
  assert.equal(card.species, normalizeSpecies(source.species), `species drift for ${card.id}`);
  assert.equal(card.fact, deriveFact(source.notes), `fact drift for ${card.id}`);
  assert.ok(pastureIds.has(card.pastureId), `missing pasture ${card.pastureId}`);
  assert.ok(pastureSpecies.get(card.pastureId).has(card.species), `${card.id} penned in the wrong pasture`);
  if (card.photo !== null) await access(new URL(`../${card.photo}`, import.meta.url));
  await access(new URL(`../${card.art}`, import.meta.url));
}
const withPhotos = pool.animals.filter((card) => card.photo).length;
assert.ok(withPhotos >= 40, `expected the bulk of the herd to carry real photos, got ${withPhotos}`);

console.log(`PASS: Farm Steward v2 validates ${pool.animals.length}/${herd.individuals.length} herd cards (${withPhotos} with own photos), ${steward.pastures.length} pastures, ${steward.taskTypes.length} species-appropriate task types, and a ${rounds.length}-step difficulty ramp.`);
