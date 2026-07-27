import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// The core is a classic script that attaches to globalThis so the browser can
// load it without a bundler; importing it here registers the same global.
await import("../assets/farm-steward-core.js");
const core = globalThis.FarmStewardCore;

const root = new URL("../", import.meta.url);
const pack = JSON.parse(await readFile(new URL("src/farm-steward.v1.json", root), "utf8"));
const pool = JSON.parse(await readFile(new URL("animals-pool.json", root), "utf8"));
const gamePack = { ...pack, animalCards: pool.animals };

test("core is loaded", () => {
  assert.ok(core, "FarmStewardCore global missing");
});

test("rounds are exactly five tasks", () => {
  for (let seed = 1; seed <= 25; seed += 1) {
    const round = core.buildRound(gamePack, 1 + (seed % 7), core.createRng(seed));
    assert.equal(round.tasks.length, pack.session.roundTasks);
    assert.equal(round.tasks.length, 5);
  }
});

test("task assignment is always species-appropriate (no shearing chickens)", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const round = core.buildRound(gamePack, 1 + (seed % 8), core.createRng(seed));
    for (const task of round.tasks) {
      assert.ok(core.taskAllowsSpecies(task.type, task.target.species),
        `${task.type.id} assigned to ${task.target.species}`);
      if (task.type.id === "shear") assert.equal(task.target.species, "Alpaca");
    }
  }
});

test("every animal always has at least one eligible task type", () => {
  for (const animal of pool.animals) {
    assert.ok(core.eligibleTaskTypes(pack.taskTypes, animal.species).length >= 3, animal.id);
  }
});

test("lineups contain the target exactly once and no duplicates", () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const round = core.buildRound(gamePack, 1 + (seed % 6), core.createRng(seed));
    for (const task of round.tasks) {
      const ids = task.lineup.map((animal) => animal.id);
      assert.equal(new Set(ids).size, ids.length, "duplicate lineup card");
      assert.equal(ids.filter((id) => id === task.target.id).length, 1, "target must appear exactly once");
      assert.equal(ids.length, round.lineupSize);
    }
  }
});

test("difficulty ramps: later rounds have tighter timers, bigger lineups, more look-alikes", () => {
  const early = core.difficultyForRound(pack.difficulty, 1);
  const late = core.difficultyForRound(pack.difficulty, 5);
  const beyond = core.difficultyForRound(pack.difficulty, 40);
  assert.ok(late.timerSeconds < early.timerSeconds);
  assert.ok(late.lineupSize > early.lineupSize);
  assert.ok(late.sameSpeciesDistractors > early.sameSpeciesDistractors);
  assert.deepEqual(beyond, late, "rounds beyond the table reuse the hardest row");
});

test("late-round lineups actually deliver look-alike distractors", () => {
  let sameSpeciesSeen = 0;
  let tasks = 0;
  for (let seed = 1; seed <= 50; seed += 1) {
    const round = core.buildRound(gamePack, 5, core.createRng(seed));
    for (const task of round.tasks) {
      tasks += 1;
      sameSpeciesSeen += task.lineup.filter((animal) => animal.id !== task.target.id && animal.species === task.target.species).length;
    }
  }
  assert.ok(sameSpeciesSeen / tasks >= 3, `expected heavy same-species pressure in round 5, got ${(sameSpeciesSeen / tasks).toFixed(2)} per task`);
});

test("clue tasks only quote clue-eligible animals and ramp in later rounds", () => {
  for (let seed = 1; seed <= 50; seed += 1) {
    const early = core.buildRound(gamePack, 1, core.createRng(seed));
    assert.equal(early.tasks.filter((task) => task.mode === "clue").length, 0, "round 1 has no clue tasks");
    const late = core.buildRound(gamePack, 5, core.createRng(seed));
    for (const task of late.tasks) {
      if (task.mode === "clue") assert.equal(task.target.clueEligible, true);
    }
  }
});

test("clue lineups are never ambiguous: no distractor shares the quoted fact", () => {
  let clueTasks = 0;
  for (let seed = 1; seed <= 150; seed += 1) {
    const round = core.buildRound(gamePack, 4 + (seed % 2), core.createRng(seed));
    for (const task of round.tasks) {
      if (task.mode !== "clue") continue;
      clueTasks += 1;
      const twins = task.lineup.filter((animal) => animal.id !== task.target.id && animal.fact === task.target.fact);
      assert.equal(twins.length, 0, `ambiguous clue for ${task.target.id} (${twins.map((animal) => animal.id).join(", ")})`);
      const ids = task.lineup.map((animal) => animal.id);
      assert.equal(new Set(ids).size, ids.length);
      assert.equal(ids.filter((id) => id === task.target.id).length, 1);
    }
  }
  assert.ok(clueTasks > 50, `expected plenty of clue tasks to sample, got ${clueTasks}`);
});

test("scoring: speed bonus on first try, half on retry, zero on timeout", () => {
  const base = { basePoints: 10, speedBonusMax: 5, timerSeconds: 10 };
  assert.equal(core.scoreAnswer({ ...base, correct: true, firstTry: true, secondsLeft: 10 }), 15);
  assert.equal(core.scoreAnswer({ ...base, correct: true, firstTry: true, secondsLeft: 0 }), 10);
  assert.equal(core.scoreAnswer({ ...base, correct: true, firstTry: false, secondsLeft: 9 }), 5);
  assert.equal(core.scoreAnswer({ ...base, correct: false, firstTry: false, secondsLeft: 0 }), 0);
});

test("daily streak: first play starts at one", () => {
  const next = core.advanceDailyStreak({}, "2026-07-27");
  assert.deepEqual(next, { streak: 1, bestStreak: 1, lastPlayedDay: "2026-07-27", extended: true });
});

test("daily streak: same-day replays change nothing", () => {
  const once = core.advanceDailyStreak({}, "2026-07-27");
  const twice = core.advanceDailyStreak(once, "2026-07-27");
  assert.equal(twice.streak, 1);
  assert.equal(twice.extended, false);
});

test("daily streak: consecutive days grow it, across month and year boundaries", () => {
  let state = core.advanceDailyStreak({}, "2026-07-31");
  state = core.advanceDailyStreak(state, "2026-08-01");
  assert.equal(state.streak, 2);
  state = core.advanceDailyStreak({ streak: 4, bestStreak: 4, lastPlayedDay: "2026-12-31" }, "2027-01-01");
  assert.equal(state.streak, 5);
  assert.equal(state.bestStreak, 5);
});

test("daily streak: a missed day resets to one but keeps the best", () => {
  const state = core.advanceDailyStreak({ streak: 6, bestStreak: 6, lastPlayedDay: "2026-07-20" }, "2026-07-27");
  assert.equal(state.streak, 1);
  assert.equal(state.bestStreak, 6);
  assert.equal(state.extended, true);
});

test("dayKey/previousDayKey are stable date-only helpers", () => {
  assert.equal(core.dayKey(new Date(2026, 6, 27, 23, 59)), "2026-07-27");
  assert.equal(core.previousDayKey("2026-03-01"), "2026-02-28");
  assert.equal(core.previousDayKey("2026-01-01"), "2025-12-31");
});
