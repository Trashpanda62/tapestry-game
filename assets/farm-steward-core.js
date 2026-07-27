/**
 * Farm Steward — pure game logic (no DOM, no fetch, no storage).
 *
 * Loaded as a classic script in the browser (attaches to globalThis as
 * FarmStewardCore) and imported for its side effect by the node:test unit
 * suite. Keep this file free of import/export syntax and browser APIs so both
 * hosts can run it unchanged.
 */
(function (global) {
  "use strict";

  /** Deterministic PRNG (mulberry32) so rounds are testable with seeds. */
  function createRng(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(items, rng) {
    var copy = items.slice();
    for (var index = copy.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(rng() * (index + 1));
      var held = copy[index];
      copy[index] = copy[swap];
      copy[swap] = held;
    }
    return copy;
  }

  /** Species that read as visually similar when only species art is on the card. */
  var lookAlikes = {
    "Highland cattle": ["Belted Galloway × Jersey"],
    "Belted Galloway × Jersey": ["Highland cattle"],
    "Alpaca": ["Goat"],
    "Goat": ["Alpaca"],
    "Pig": ["Goat"],
    "Mule": ["Highland cattle"]
  };

  /** True when a task type may target this species — no shearing chickens. */
  function taskAllowsSpecies(taskType, species) {
    return taskType.species === "any" || taskType.species.indexOf(species) >= 0;
  }

  function eligibleTaskTypes(taskTypes, species) {
    return taskTypes.filter(function (taskType) { return taskAllowsSpecies(taskType, species); });
  }

  /** Difficulty row for a round; rounds past the table reuse the hardest row. */
  function difficultyForRound(difficulty, roundNumber) {
    var rounds = difficulty.rounds;
    var capped = Math.max(1, Math.min(roundNumber, rounds[rounds.length - 1].round));
    for (var index = 0; index < rounds.length; index += 1) {
      if (rounds[index].round === capped) return rounds[index];
    }
    return rounds[rounds.length - 1];
  }

  /**
   * Pick the round's target animals. Later rounds prefer species with enough
   * herd-mates to fill the look-alike distractor quota, so hard rounds stay
   * hard instead of degrading to cross-species lineups.
   */
  function pickTargets(pool, row, count, rng) {
    var bySpecies = {};
    pool.forEach(function (animal) {
      (bySpecies[animal.species] = bySpecies[animal.species] || []).push(animal);
    });
    var preferred = pool.filter(function (animal) {
      return bySpecies[animal.species].length > row.sameSpeciesDistractors;
    });
    var source = preferred.length >= count ? preferred : pool;
    return shuffle(source, rng).slice(0, count);
  }

  /**
   * Assign each target a species-appropriate task type, spreading variety by
   * always taking a least-used eligible type.
   */
  function assignTaskTypes(targets, taskTypes, rng) {
    var used = {};
    return targets.map(function (target) {
      var eligible = eligibleTaskTypes(taskTypes, target.species);
      if (!eligible.length) throw new Error("No eligible task type for species " + target.species);
      var minUse = Math.min.apply(null, eligible.map(function (taskType) { return used[taskType.id] || 0; }));
      var leastUsed = eligible.filter(function (taskType) { return (used[taskType.id] || 0) === minUse; });
      var chosen = leastUsed[Math.floor(rng() * leastUsed.length)];
      used[chosen.id] = (used[chosen.id] || 0) + 1;
      return chosen;
    });
  }

  /**
   * Build the answer lineup for one task: the target plus distractors.
   * Distractor priority: same species (look-alike quota), then look-alike
   * species, then anyone else. Exactly one card is the target. Clue tasks
   * pass excludeSameFact so herd-mates sharing the target's verified note
   * (many alpacas share "Halter-trained boy…") can never make the quoted
   * clue ambiguous.
   */
  function buildLineup(pool, target, row, rng, options) {
    var excludeSameFact = options && options.excludeSameFact;
    var others = pool.filter(function (animal) {
      if (animal.id === target.id) return false;
      if (excludeSameFact && animal.fact === target.fact) return false;
      return true;
    });
    var sameSpecies = shuffle(others.filter(function (animal) { return animal.species === target.species; }), rng);
    var similar = shuffle(others.filter(function (animal) {
      return animal.species !== target.species && (lookAlikes[target.species] || []).indexOf(animal.species) >= 0;
    }), rng);
    var rest = shuffle(others.filter(function (animal) {
      return sameSpecies.indexOf(animal) < 0 && similar.indexOf(animal) < 0;
    }), rng);
    var needed = row.lineupSize - 1;
    var distractors = sameSpecies.slice(0, Math.min(row.sameSpeciesDistractors, needed));
    var fill = similar.concat(rest, sameSpecies.slice(distractors.length));
    for (var index = 0; distractors.length < needed && index < fill.length; index += 1) {
      if (distractors.indexOf(fill[index]) < 0) distractors.push(fill[index]);
    }
    return shuffle([target].concat(distractors), rng);
  }

  /**
   * Build a full round: `roundTasks` tasks, each with a task type, target,
   * lineup, and prompt mode. Clue tasks (find the animal from its verified
   * fact instead of its name) land at the end of the round.
   */
  function buildRound(pack, roundNumber, rng) {
    var row = difficultyForRound(pack.difficulty, roundNumber);
    var targets = pickTargets(pack.animalCards, row, pack.session.roundTasks, rng);
    var types = assignTaskTypes(targets, pack.taskTypes, rng);
    var clueBudget = Math.min(row.clueTasks, targets.filter(function (animal) { return animal.clueEligible; }).length);
    var tasks = targets.map(function (target, index) {
      return { type: types[index], target: target, lineup: buildLineup(pack.animalCards, target, row, rng), mode: "name" };
    });
    for (var index = tasks.length - 1; index >= 0 && clueBudget > 0; index -= 1) {
      if (tasks[index].target.clueEligible) {
        tasks[index].mode = "clue";
        tasks[index].lineup = buildLineup(pack.animalCards, tasks[index].target, row, rng, { excludeSameFact: true });
        clueBudget -= 1;
      }
    }
    return { round: roundNumber, timerSeconds: row.timerSeconds, lineupSize: row.lineupSize, tasks: tasks };
  }

  /** Points for an answer: full + speed bonus first try, half on a retry, zero on timeout. */
  function scoreAnswer(options) {
    if (!options.correct) return 0;
    var base = options.basePoints;
    if (!options.firstTry) return Math.floor(base / 2);
    var ratio = options.timerSeconds > 0 ? Math.max(0, Math.min(1, options.secondsLeft / options.timerSeconds)) : 0;
    return base + Math.round((options.speedBonusMax || 0) * ratio);
  }

  /** Local-date key, e.g. 2026-07-27. */
  function dayKey(date) {
    var d = date || new Date();
    var month = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + "-" + (month.length < 2 ? "0" + month : month) + "-" + (day.length < 2 ? "0" + day : day);
  }

  function previousDayKey(key) {
    var parts = key.split("-").map(Number);
    var utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    utc.setUTCDate(utc.getUTCDate() - 1);
    var month = String(utc.getUTCMonth() + 1);
    var day = String(utc.getUTCDate());
    return utc.getUTCFullYear() + "-" + (month.length < 2 ? "0" + month : month) + "-" + (day.length < 2 ? "0" + day : day);
  }

  /**
   * Daily streak rules: one credit per calendar day. Consecutive days grow the
   * streak, a missed day resets it to 1, repeat plays the same day change
   * nothing.
   */
  function advanceDailyStreak(previous, todayKey) {
    var prior = previous || {};
    var streak = Number(prior.streak) > 0 ? Number(prior.streak) : 0;
    var best = Number(prior.bestStreak) > 0 ? Number(prior.bestStreak) : 0;
    if (prior.lastPlayedDay === todayKey) {
      return { streak: streak, bestStreak: Math.max(best, streak), lastPlayedDay: todayKey, extended: false };
    }
    var next = prior.lastPlayedDay === previousDayKey(todayKey) ? streak + 1 : 1;
    return { streak: next, bestStreak: Math.max(best, next), lastPlayedDay: todayKey, extended: true };
  }

  global.FarmStewardCore = {
    createRng: createRng,
    shuffle: shuffle,
    lookAlikes: lookAlikes,
    taskAllowsSpecies: taskAllowsSpecies,
    eligibleTaskTypes: eligibleTaskTypes,
    difficultyForRound: difficultyForRound,
    pickTargets: pickTargets,
    assignTaskTypes: assignTaskTypes,
    buildLineup: buildLineup,
    buildRound: buildRound,
    scoreAnswer: scoreAnswer,
    dayKey: dayKey,
    previousDayKey: previousDayKey,
    advanceDailyStreak: advanceDailyStreak
  };
}(typeof globalThis !== "undefined" ? globalThis : this));
