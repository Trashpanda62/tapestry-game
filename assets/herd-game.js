/**
 * Farm Steward — game runtime for meet-the-herd.html.
 *
 * Pure rules live in assets/farm-steward-core.js (FarmStewardCore); this file
 * owns fetch, DOM, timers, and localStorage. Data comes from the built
 * content pack (data/farm-steward.v1.json), whose cards mirror the verified
 * herd export one-to-one.
 */
(function () {
  "use strict";

  var mount = document.getElementById("herd-game");
  var core = window.FarmStewardCore;
  if (!mount || !core) return;

  var base = "/s/tapestry-acres/";
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pack;
  var state;
  var roundsThisVisit = 0;
  var timerHandle = null;
  var rng = core.createRng(Date.now() >>> 0);

  function readState(key) {
    try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (_) { return {}; }
  }
  function saveState() {
    try { localStorage.setItem(pack.session.storageKey, JSON.stringify(state)); } catch (_) {}
  }
  function stopTimer() {
    if (timerHandle) { window.clearInterval(timerHandle); timerHandle = null; }
  }
  function text(tag, className, value) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  }
  function cardImage(animal) {
    var element = document.createElement("img");
    element.src = base + (animal.photo || animal.art);
    element.alt = animal.photo ? ("Photo of " + animal.name) : (animal.species + " herd art standing in for " + animal.name);
    element.loading = "lazy";
    return element;
  }
  function taskChip(taskType) {
    var chip = text("span", "task-chip task-chip-" + taskType.id, "");
    var icon = text("span", "task-chip-icon", taskType.icon);
    icon.setAttribute("aria-hidden", "true");
    chip.appendChild(icon);
    chip.appendChild(text("span", "", taskType.label));
    return chip;
  }
  function streakLine() {
    var streak = (state.daily && state.daily.streak) || 0;
    var best = (state.daily && state.daily.bestStreak) || 0;
    return "Day streak " + streak + (best > streak ? " (best " + best + ")" : "") + " · Total score " + (state.score || 0) + " · Best round " + (state.bestRound || 0);
  }
  function renderError() {
    mount.replaceChildren(text("p", "game-message", "The herd is out grazing. Refresh to try again."));
  }

  function renderStart() {
    stopTimer();
    mount.replaceChildren();
    var intro = text("div", "game-start", "");
    intro.appendChild(text("p", "game-stats", streakLine()));
    intro.appendChild(text("p", "", "Five steward tasks per round: feed runs, water checks, vet look-overs, shearing days, and herd moves. Find the right animal before the clock runs out — later rounds bring bigger lineups, look-alike herd-mates, and tighter timers."));
    intro.appendChild(text("p", "", "Play any round today to keep your day streak alive. Every card is a real animal from the verified herd record."));
    var button = text("button", "btn", "Start the game");
    button.type = "button";
    button.addEventListener("click", startRound);
    intro.appendChild(button);
    mount.appendChild(intro);
  }

  function startRound() {
    stopTimer();
    roundsThisVisit += 1;
    var round = core.buildRound(pack, roundsThisVisit, rng);
    playTask(round, 0, 0);
  }

  function promptFor(task) {
    if (task.mode === "clue") {
      return task.type.label + ": one " + task.target.species.toLowerCase() + " " + task.type.wording + ". The herd record says: “" + task.target.fact + "” Who is it?";
    }
    return task.type.label + ": " + task.target.name + " " + task.type.wording + ". Find " + task.target.name + ".";
  }

  function playTask(round, index, roundScore) {
    stopTimer();
    if (index >= round.tasks.length) return finishRound(round, roundScore);
    var task = round.tasks[index];
    var firstTry = true;
    var secondsLeft = round.timerSeconds;
    var settled = false;

    mount.replaceChildren();
    var shell = text("div", "game-round", "");
    var meta = text("p", "game-progress", "Round " + round.round + " · Task " + (index + 1) + " of " + round.tasks.length + " · Round points " + roundScore);
    var header = text("div", "task-header", "");
    header.appendChild(taskChip(task.type));
    var timer = text("p", "game-timer", secondsLeft + "s left");
    header.appendChild(timer);
    var prompt = text("p", "task-prompt", promptFor(task));
    var group = text("div", "steward-lineup", "");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Pick the right animal");
    var feedback = text("p", "game-feedback", "Choose a card. Wrong picks cost the speed bonus, not the task.");

    function settle(points, message, good) {
      settled = true;
      stopTimer();
      group.querySelectorAll("button").forEach(function (item) { item.disabled = true; });
      feedback.className = "game-feedback " + (good ? "is-right" : "is-wrong");
      feedback.textContent = message;
      window.setTimeout(function () { playTask(round, index + 1, roundScore + points); }, reducedMotion ? 120 : 900);
    }

    task.lineup.forEach(function (animal) {
      var button = text("button", "pasture-choice steward-choice", "");
      button.type = "button";
      button.appendChild(cardImage(animal));
      var label = text("span", "steward-choice-copy", "");
      label.appendChild(text("strong", "", animal.name));
      label.appendChild(text("small", "", animal.species));
      button.appendChild(label);
      button.addEventListener("click", function () {
        if (settled) return;
        if (animal.id !== task.target.id) {
          firstTry = false;
          button.classList.add("is-wrong");
          button.disabled = true;
          feedback.className = "game-feedback is-wrong";
          feedback.textContent = "That is " + animal.name + " the " + animal.species.toLowerCase() + " — keep looking.";
          return;
        }
        var points = core.scoreAnswer({ correct: true, firstTry: firstTry, secondsLeft: secondsLeft, timerSeconds: round.timerSeconds, basePoints: task.type.points, speedBonusMax: pack.session.speedBonusMax });
        button.classList.add("is-right");
        settle(points, "Correct — " + task.target.name + ". +" + points + " points.", true);
      });
      group.appendChild(button);
    });

    shell.appendChild(meta);
    shell.appendChild(header);
    shell.appendChild(prompt);
    shell.appendChild(group);
    shell.appendChild(feedback);
    mount.appendChild(shell);

    timerHandle = window.setInterval(function () {
      secondsLeft -= 1;
      if (secondsLeft > 0) {
        timer.textContent = secondsLeft + "s left";
        if (secondsLeft <= 3) timer.classList.add("is-low");
        return;
      }
      timer.textContent = "0s";
      settle(0, "Time's up — that was " + task.target.name + " in " + pastureLabel(task.target.pastureId) + ".", false);
    }, 1000);
  }

  function pastureLabel(pastureId) {
    var pasture = pack.pastures.find(function (item) { return item.id === pastureId; });
    return pasture ? pasture.label : "the pasture";
  }

  function finishRound(round, roundScore) {
    stopTimer();
    state.score = (state.score || 0) + roundScore;
    state.bestRound = Math.max(state.bestRound || 0, roundScore);
    var daily = core.advanceDailyStreak(state.daily, core.dayKey());
    var extended = daily.extended;
    state.daily = { streak: daily.streak, bestStreak: daily.bestStreak, lastPlayedDay: daily.lastPlayedDay };
    saveState();

    mount.replaceChildren();
    var done = text("div", "game-complete", "");
    done.appendChild(text("p", "game-label", "ROUND " + round.round + " COMPLETE"));
    done.appendChild(text("h2", "", roundScore > 0 ? "Good steward work." : "The herd forgives slow mornings."));
    done.appendChild(text("p", "game-score", "+" + roundScore + " points · " + state.score + " total"));
    done.appendChild(text("p", "", extended
      ? "Day streak extended to " + daily.streak + (daily.streak > 1 ? " days" : " day") + ". Come back tomorrow to keep it going."
      : "Day streak holds at " + daily.streak + " — already counted for today."));
    done.appendChild(text("p", "", "Round " + (round.round + 1) + " pulls more look-alike herd-mates and a tighter clock."));
    var actions = text("div", "game-actions", "");
    var replay = text("button", "btn", "Play another round");
    replay.type = "button";
    replay.addEventListener("click", startRound);
    actions.appendChild(replay);
    var roster = document.createElement("a");
    roster.className = "btn ghost";
    roster.href = base + "animals#group-alpacas";
    roster.textContent = "Browse the herd roster";
    actions.appendChild(roster);
    done.appendChild(actions);
    mount.appendChild(done);
  }

  function init(payload) {
    pack = payload.data || payload;
    state = readState(pack.session.storageKey);
    renderStart();
  }

  fetch(base + "data/farm-steward.v1.json", { cache: "no-cache" }).then(function (response) {
    if (!response.ok) throw new Error("Game data unavailable");
    return response.json();
  }).then(init).catch(renderError);
}());
