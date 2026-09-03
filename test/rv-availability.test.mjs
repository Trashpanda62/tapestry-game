import { test } from "node:test";
import assert from "node:assert/strict";

// Classic script that attaches to globalThis so the browser can load it without
// a bundler; importing it here registers the same global. Same convention as
// test/farm-steward-core.test.mjs.
await import("../assets/rv-availability.js");
const RV = globalThis.RVAvailability;

// ---------------------------------------------------------------------------
// 1. parseDate / formatDate round-trip
// ---------------------------------------------------------------------------

test("parseDate/formatDate round-trip on ordinary dates", () => {
  const cases = ["2026-07-15", "2026-01-01", "2026-12-31", "2025-12-31", "2026-01-01"];
  for (const str of cases) {
    const day = RV.parseDate(str);
    assert.notEqual(day, null, str + " should parse");
    assert.equal(RV.formatDate(day), str);
  }
});

test("parseDate/formatDate round-trip on a leap day", () => {
  const day = RV.parseDate("2028-02-29");
  assert.notEqual(day, null);
  assert.equal(RV.formatDate(day), "2028-02-29");
  // the following day rolls into March on a leap year
  assert.equal(RV.formatDate(day + 1), "2028-03-01");
});

test("parseDate/formatDate round-trip across a year boundary", () => {
  const dec31 = RV.parseDate("2026-12-31");
  const jan1 = RV.parseDate("2027-01-01");
  assert.equal(jan1 - dec31, 1);
  assert.equal(RV.formatDate(dec31), "2026-12-31");
  assert.equal(RV.formatDate(jan1), "2027-01-01");
});

// ---------------------------------------------------------------------------
// 2. parseDate malformed input
// ---------------------------------------------------------------------------

test("parseDate returns null for malformed or invalid input", () => {
  assert.equal(RV.parseDate(""), null);
  assert.equal(RV.parseDate("2026-13-01"), null); // no month 13
  assert.equal(RV.parseDate("not-a-date"), null);
  assert.equal(RV.parseDate(null), null);
  assert.equal(RV.parseDate("2026-7-1"), null); // not zero-padded
  assert.equal(RV.parseDate(undefined), null);
  assert.equal(RV.parseDate("2026-02-30"), null); // Feb never has 30 days
  assert.equal(RV.parseDate("2026-00-10"), null); // month 0 invalid
  assert.equal(RV.parseDate("2026-04-31"), null); // April has 30 days
});

// ---------------------------------------------------------------------------
// 3. Exclusive-end boundary (the main risk called out in the spec)
// ---------------------------------------------------------------------------

const MAX2 = "max-2";
const fixturePayload = {
  updated: "2026-07-19",
  bookings: [
    { unit: "max-2", start: "2026-07-15", end: "2026-07-29" },
    { unit: "max-2", start: "2026-09-06", end: "2026-11-04" }
  ]
};

test("exclusive end: checkout day is free, day before checkout is not", () => {
  const index = RV.indexBookings(fixturePayload);
  const in29 = RV.parseDate("2026-07-29");
  const in28 = RV.parseDate("2026-07-28");
  const out30 = RV.parseDate("2026-07-30");

  // Checking in on the booking's checkout day (07-29) must be available.
  assert.equal(RV.isUnitAvailable(index, MAX2, in29, out30), true);
  // Checking in the night before checkout (07-28) must NOT be available.
  assert.equal(RV.isUnitAvailable(index, MAX2, in28, out30), false);

  // Night-level check: the 28th is a booked night, the 29th (checkout) is not.
  assert.equal(RV.isNightBooked(index, MAX2, in28), true);
  assert.equal(RV.isNightBooked(index, MAX2, in29), false);
});

// ---------------------------------------------------------------------------
// 4. Back-to-back bookings leave no phantom gap
// ---------------------------------------------------------------------------

test("back-to-back bookings leave no gap for a stay spanning the join", () => {
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "u1", start: "2026-03-01", end: "2026-03-10" },
      { unit: "u1", start: "2026-03-10", end: "2026-03-20" }
    ]
  };
  const index = RV.indexBookings(payload);
  const in05 = RV.parseDate("2026-03-05");
  const out15 = RV.parseDate("2026-03-15");
  // Spans across the 03-10 join date, which is booked-out by the second
  // range immediately as the first one's checkout lands.
  assert.equal(RV.isUnitAvailable(index, "u1", in05, out15), false);
  // A single-night stay starting exactly at the join is also unavailable,
  // proving there is no phantom free night at the seam.
  const in10 = RV.parseDate("2026-03-10");
  const out11 = RV.parseDate("2026-03-11");
  assert.equal(RV.isUnitAvailable(index, "u1", in10, out11), false);
});

// ---------------------------------------------------------------------------
// 5. A stay that fully contains a booking is unavailable
// ---------------------------------------------------------------------------

test("a stay that fully contains a booking is unavailable", () => {
  const index = RV.indexBookings(fixturePayload);
  const in10 = RV.parseDate("2026-07-10");
  const out31 = RV.parseDate("2026-07-31");
  assert.equal(RV.isUnitAvailable(index, MAX2, in10, out31), false);
});

// ---------------------------------------------------------------------------
// 6. Stays entirely before / entirely after a booking are available
// ---------------------------------------------------------------------------

test("a stay entirely before a booking is available", () => {
  const index = RV.indexBookings(fixturePayload);
  const in01 = RV.parseDate("2026-07-01");
  const out10 = RV.parseDate("2026-07-10");
  assert.equal(RV.isUnitAvailable(index, MAX2, in01, out10), true);
});

test("a stay entirely after a booking is available", () => {
  const index = RV.indexBookings(fixturePayload);
  const in01 = RV.parseDate("2026-08-01");
  const out10 = RV.parseDate("2026-08-10");
  assert.equal(RV.isUnitAvailable(index, MAX2, in01, out10), true);
});

// ---------------------------------------------------------------------------
// 7. isUnitAvailable(checkOut <= checkIn) -> false
// ---------------------------------------------------------------------------

test("isUnitAvailable is false when checkout is not after check-in", () => {
  const index = RV.indexBookings(fixturePayload);
  const day = RV.parseDate("2026-08-01");
  assert.equal(RV.isUnitAvailable(index, MAX2, day, day), false);
  assert.equal(RV.isUnitAvailable(index, MAX2, day, day - 1), false);
});

// ---------------------------------------------------------------------------
// 8. Unit with no bookings
// ---------------------------------------------------------------------------

test("a unit with no bookings is always available", () => {
  const index = RV.indexBookings(fixturePayload);
  const in01 = RV.parseDate("2026-07-01");
  const out05 = RV.parseDate("2026-07-05");
  assert.equal(RV.isUnitAvailable(index, "unknown-unit", in01, out05), true);
});

test("nextAvailableDate returns fromDay unchanged for a unit with no bookings", () => {
  const index = RV.indexBookings(fixturePayload);
  const from = RV.parseDate("2026-07-01");
  assert.equal(RV.nextAvailableDate(index, "unknown-unit", from), from);
  assert.equal(RV.nextAvailableDate(index, "unknown-unit", from, 5), from);
});

// ---------------------------------------------------------------------------
// 9. nextAvailableDate skips booked spans / honors nights > 1
// ---------------------------------------------------------------------------

test("nextAvailableDate skips a booked span and lands on the checkout day", () => {
  const index = RV.indexBookings(fixturePayload);
  const from = RV.parseDate("2026-07-20"); // inside the 07-15..07-29 booking
  const next = RV.nextAvailableDate(index, MAX2, from, 1);
  assert.equal(next, RV.parseDate("2026-07-29"));
});

test("nextAvailableDate with nights > 1 skips a gap too small to fit", () => {
  // Two bookings with a 2-night gap between them (03-10 checkout to 03-12
  // check-in). A 3-night stay cannot fit in that gap and must skip past it.
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "u1", start: "2026-03-01", end: "2026-03-10" },
      { unit: "u1", start: "2026-03-12", end: "2026-03-20" }
    ]
  };
  const index = RV.indexBookings(payload);
  const from = RV.parseDate("2026-03-01");

  // A 2-night stay fits exactly in the gap (03-10 to 03-12).
  const twoNight = RV.nextAvailableDate(index, "u1", from, 2);
  assert.equal(twoNight, RV.parseDate("2026-03-10"));

  // A 3-night stay does not fit in the 2-night gap and must land after the
  // second booking's checkout (03-20).
  const threeNight = RV.nextAvailableDate(index, "u1", from, 3);
  assert.equal(threeNight, RV.parseDate("2026-03-20"));
});

// ---------------------------------------------------------------------------
// 10. nextAvailableDate returns null past the search horizon
// ---------------------------------------------------------------------------

test("nextAvailableDate returns null when booked solid past the search horizon", () => {
  const from = RV.parseDate("2026-01-01");
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "u1", start: "2026-01-01", end: RV.formatDate(from + 500) }
    ]
  };
  const index = RV.indexBookings(payload);
  assert.equal(RV.nextAvailableDate(index, "u1", from, 1), null);
});

// ---------------------------------------------------------------------------
// 11. availableUnitsOn / countAvailableNight with the real fixture
// ---------------------------------------------------------------------------

test("availableUnitsOn preserves input order using the real max-2 fixture", () => {
  const index = RV.indexBookings(fixturePayload);
  const unitIds = ["max-1", "max-2", "max-3"];
  const in20 = RV.parseDate("2026-07-20");
  const out25 = RV.parseDate("2026-07-25");
  // max-2 is booked 07-15..07-29, so it's excluded; the untracked units
  // (no bookings at all) remain available and keep their given order.
  assert.deepEqual(RV.availableUnitsOn(index, unitIds, in20, out25), ["max-1", "max-3"]);

  const in01 = RV.parseDate("2026-08-01");
  const out05 = RV.parseDate("2026-08-05");
  assert.deepEqual(RV.availableUnitsOn(index, unitIds, in01, out05), ["max-1", "max-2", "max-3"]);
});

test("countAvailableNight with the real max-2 fixture plus other units", () => {
  const index = RV.indexBookings(fixturePayload);
  const unitIds = ["max-1", "max-2", "max-3"];
  const bookedNight = RV.parseDate("2026-07-20");
  assert.equal(RV.countAvailableNight(index, unitIds, bookedNight), 2); // max-2 out
  const freeNight = RV.parseDate("2026-08-15");
  assert.equal(RV.countAvailableNight(index, unitIds, freeNight), 3);
});

// ---------------------------------------------------------------------------
// 12. indexBookings ignores malformed entries, preserves updated, sorts ranges
// ---------------------------------------------------------------------------

test("indexBookings ignores malformed entries and preserves updated", () => {
  const payload = {
    updated: "2026-07-19",
    bookings: [
      { unit: "max-2", start: "2026-09-06", end: "2026-11-04" },
      { unit: "max-2", start: "2026-07-15", end: "2026-07-29" },
      { unit: "", start: "2026-07-01", end: "2026-07-05" }, // blank unit
      { unit: "max-3", start: "not-a-date", end: "2026-07-05" }, // bad start
      { unit: "max-3", start: "2026-07-01", end: "not-a-date" }, // bad end
      { unit: "max-3", start: "2026-07-10", end: "2026-07-05" }, // start >= end
      { unit: "max-3" }, // missing dates entirely
      null, // null entry
      "not-an-object" // wrong shape entirely
    ]
  };
  const index = RV.indexBookings(payload);
  assert.equal(index.updated, "2026-07-19");
  assert.equal(Object.keys(index.byUnit).length, 1); // only max-2 survives
  const ranges = index.byUnit["max-2"];
  assert.equal(ranges.length, 2);
  // sorted ascending by startDay even though input listed 09-06 first
  assert.equal(RV.formatDate(ranges[0].startDay), "2026-07-15");
  assert.equal(RV.formatDate(ranges[1].startDay), "2026-09-06");
});

test("indexBookings yields null updated when missing, and handles empty bookings", () => {
  const index = RV.indexBookings({ bookings: [] });
  assert.equal(index.updated, null);
  assert.deepEqual(index.byUnit, {});
});

// ---------------------------------------------------------------------------
// 13. monthGrid
// ---------------------------------------------------------------------------

test("monthGrid: July 2026 starts on Wednesday, Sunday-first alignment", () => {
  const grid = RV.monthGrid(2026, 7);
  assert.equal(grid.label, "July 2026");
  assert.equal(grid.year, 2026);
  assert.equal(grid.month, 7);
  // July 1 2026 is a Wednesday -> 3 leading nulls (Sun, Mon, Tue)
  assert.deepEqual(grid.weeks[0].slice(0, 3), [null, null, null]);
  assert.equal(grid.weeks[0][3].day, 1);
  assert.equal(grid.weeks[0][3].date, RV.parseDate("2026-07-01"));
  // July has 31 days -> 3 leading nulls + 31 days = 34 cells, padded up to
  // 35 (5 weeks); day 31 lands at position 5 of the last week, leaving a
  // single trailing null.
  assert.equal(grid.weeks.length, 5);
  const lastWeek = grid.weeks[4];
  assert.equal(lastWeek[5].day, 31);
  assert.deepEqual(lastWeek.slice(6), [null]);
});

test("monthGrid: null padding and correct day count for every week", () => {
  const grid = RV.monthGrid(2026, 7);
  for (const week of grid.weeks) {
    assert.equal(week.length, 7);
  }
  let dayCount = 0;
  for (const week of grid.weeks) {
    for (const cell of week) {
      if (cell !== null) dayCount++;
    }
  }
  assert.equal(dayCount, 31);
});

test("monthGrid: inPast flags days before options.today", () => {
  const today = RV.parseDate("2026-07-15");
  const grid = RV.monthGrid(2026, 7, { today: today });
  const flat = grid.weeks.flat().filter((c) => c !== null);
  for (const cell of flat) {
    if (cell.day < 15) assert.equal(cell.inPast, true, "day " + cell.day + " should be past");
    else assert.equal(cell.inPast, false, "day " + cell.day + " should not be past");
  }
});

test("monthGrid: nothing is past when options.today is omitted", () => {
  const grid = RV.monthGrid(2026, 7);
  const flat = grid.weeks.flat().filter((c) => c !== null);
  for (const cell of flat) {
    assert.equal(cell.inPast, false);
  }
});

test("monthGrid: handles February in a leap year", () => {
  const grid = RV.monthGrid(2028, 2);
  assert.equal(grid.label, "February 2028");
  let dayCount = 0;
  for (const week of grid.weeks) {
    for (const cell of week) if (cell !== null) dayCount++;
  }
  assert.equal(dayCount, 29); // 2028 is a leap year
  const lastCell = grid.weeks.flat().filter((c) => c !== null).pop();
  assert.equal(lastCell.day, 29);
  assert.equal(RV.formatDate(lastCell.date), "2028-02-29");
});

test("monthGrid: handles February in a non-leap year", () => {
  const grid = RV.monthGrid(2026, 2);
  let dayCount = 0;
  for (const week of grid.weeks) {
    for (const cell of week) if (cell !== null) dayCount++;
  }
  assert.equal(dayCount, 28); // 2026 is not a leap year
});

// ---------------------------------------------------------------------------
// 14. nextOpenNight: scope-aware "any unit in the class works" search
// ---------------------------------------------------------------------------

test("nextOpenNight returns null for an empty or missing unit scope", () => {
  const index = RV.indexBookings(fixturePayload);
  const from = RV.parseDate("2026-07-20");
  assert.equal(RV.nextOpenNight(index, [], from, 1), null);
  assert.equal(RV.nextOpenNight(index, undefined, from, 1), null);
});

test("nextOpenNight returns fromDay when nothing is booked", () => {
  const index = RV.indexBookings({ bookings: [] });
  const from = RV.parseDate("2026-07-01");
  assert.equal(RV.nextOpenNight(index, ["max-1", "max-2"], from, 1), from);
});

test("nextOpenNight returns fromDay when only one of several units is booked", () => {
  const index = RV.indexBookings(fixturePayload); // max-2 booked 07-15..07-29
  const from = RV.parseDate("2026-07-20"); // inside max-2's booking
  const result = RV.nextOpenNight(index, ["max-1", MAX2, "max-3"], from, 1);
  // max-1 and max-3 carry no bookings at all, so the class is open on fromDay
  // even though max-2 itself is unavailable.
  assert.equal(result, from);
});

test("nextOpenNight returns the earliest day the earliest-freeing unit can host the whole stay", () => {
  // Unit "a" checks out on 05-06 but is immediately re-booked for one more
  // night (05-06..05-07), so it cannot host a 2-night stay until 05-07.
  // Unit "b" is booked straight through to 05-08 with nothing after. Even
  // though "b"'s single checkout (05-08) is later than "a"'s first checkout
  // (05-06), "a" is still the unit that opens up soonest for the WHOLE
  // 2-night stay -- at 05-07, a day before "b" ever opens up.
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "a", start: "2026-05-01", end: "2026-05-06" },
      { unit: "a", start: "2026-05-06", end: "2026-05-07" },
      { unit: "b", start: "2026-05-01", end: "2026-05-08" }
    ]
  };
  const index = RV.indexBookings(payload);
  const from = RV.parseDate("2026-05-01");
  const result = RV.nextOpenNight(index, ["a", "b"], from, 2);
  assert.equal(result, RV.parseDate("2026-05-07"));
});

test("nextOpenNight respects checkout-day exclusivity", () => {
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "solo", start: "2026-06-01", end: "2026-06-10" }
    ]
  };
  const index = RV.indexBookings(payload);
  const from = RV.parseDate("2026-06-01");
  const checkoutDay = RV.parseDate("2026-06-10");
  const result = RV.nextOpenNight(index, ["solo"], from, 1);
  // Available checking in ON the checkout day for a 1-night stay...
  assert.equal(result, checkoutDay);
  // ...and NOT pushed out to the day after.
  assert.notEqual(result, checkoutDay + 1);
});

test("nextOpenNight with nights > 1 skips a gap too small to fit", () => {
  // Same shape as the nextAvailableDate gap test above: a 2-night gap
  // (03-10 checkout to 03-12 check-in) that a 3-night stay cannot fit in,
  // forcing the search past the second booking's checkout.
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "u1", start: "2026-03-01", end: "2026-03-10" },
      { unit: "u1", start: "2026-03-12", end: "2026-03-20" }
    ]
  };
  const index = RV.indexBookings(payload);
  const from = RV.parseDate("2026-03-01");
  const result = RV.nextOpenNight(index, ["u1"], from, 3);
  assert.equal(result, RV.parseDate("2026-03-20"));
});

test("nextOpenNight treats 0, negative, and non-number nights as 1 night", () => {
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "solo", start: "2026-06-01", end: "2026-06-10" }
    ]
  };
  const index = RV.indexBookings(payload);
  const from = RV.parseDate("2026-06-01");
  const checkoutDay = RV.parseDate("2026-06-10");
  assert.equal(RV.nextOpenNight(index, ["solo"], from, 0), checkoutDay);
  assert.equal(RV.nextOpenNight(index, ["solo"], from, -3), checkoutDay);
  assert.equal(RV.nextOpenNight(index, ["solo"], from, "not-a-number"), checkoutDay);
});

test("nextOpenNight returns null when every unit is booked solid past the search horizon", () => {
  const from = RV.parseDate("2026-01-01");
  const payload = {
    updated: "2026-01-01",
    bookings: [
      { unit: "u1", start: "2026-01-01", end: RV.formatDate(from + 500) },
      { unit: "u2", start: "2026-01-01", end: RV.formatDate(from + 500) }
    ]
  };
  const index = RV.indexBookings(payload);
  assert.equal(RV.nextOpenNight(index, ["u1", "u2"], from, 1), null);
});
