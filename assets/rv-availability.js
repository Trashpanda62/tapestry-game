// RV rental availability calendar logic.
//
// Pure date/availability math for the To The Max RV booking calendar. No DOM
// access, no fetch, no storage. Loaded as a classic script in the browser
// (attaches globalThis.RVAvailability) and imported for its side effect by the
// node:test unit suite — the same pattern as assets/farm-steward-core.js. Keep
// this file free of import/export syntax so both hosts run it unchanged.
//
// TIMEZONE SAFETY: every date is parsed and formatted through Date.UTC, never
// through `new Date(str)`. Parsing "2026-07-15" with the Date constructor is
// interpreted as UTC midnight and then rendered in the local timezone, which
// can print as "2026-07-14" for anyone west of UTC (e.g. Tennessee, UTC-5).
// Using Date.UTC consistently for both parsing and formatting keeps every
// date a plain calendar date with no timezone component at all.
(function (global) {
  "use strict";

  var MS_PER_DAY = 86400000;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var MAX_SEARCH_DAYS = 400;

  // parseDate("YYYY-MM-DD") -> integer day-number (days since 1970-01-01 UTC),
  // or null if the string is not a strictly-formatted, calendar-valid date.
  function parseDate(str) {
    if (typeof str !== "string") return null;
    var match = DATE_RE.exec(str);
    if (!match) return null;
    var y = parseInt(match[1], 10);
    var m = parseInt(match[2], 10);
    var d = parseInt(match[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    var ms = Date.UTC(y, m - 1, d);
    var check = new Date(ms);
    // Date.UTC silently rolls over invalid day-of-month values (e.g. Feb 30
    // becomes Mar 2). Reject anything that didn't round-trip exactly, which
    // catches month/day combinations that don't exist on the calendar.
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
      return null;
    }
    return Math.floor(ms / MS_PER_DAY);
  }

  // formatDate(dayNumber) -> "YYYY-MM-DD"
  function formatDate(dayNumber) {
    var date = new Date(dayNumber * MS_PER_DAY);
    var y = date.getUTCFullYear();
    var m = date.getUTCMonth() + 1;
    var d = date.getUTCDate();
    return y + "-" + pad2(m) + "-" + pad2(d);
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // indexBookings(payload) -> { byUnit: { unitId: [{startDay, endDay}] }, updated }
  // Malformed entries (missing/blank unit, unparseable dates, or a range
  // where start is not strictly before end) are skipped rather than thrown.
  function indexBookings(payload) {
    var byUnit = {};
    var bookings = (payload && Array.isArray(payload.bookings)) ? payload.bookings : [];
    for (var i = 0; i < bookings.length; i++) {
      var entry = bookings[i];
      if (!entry || typeof entry.unit !== "string" || entry.unit === "") continue;
      var startDay = parseDate(entry.start);
      var endDay = parseDate(entry.end);
      if (startDay === null || endDay === null) continue;
      if (startDay >= endDay) continue;
      if (!byUnit[entry.unit]) byUnit[entry.unit] = [];
      byUnit[entry.unit].push({ startDay: startDay, endDay: endDay });
    }
    var unitIds = Object.keys(byUnit);
    for (var u = 0; u < unitIds.length; u++) {
      byUnit[unitIds[u]].sort(function (a, b) { return a.startDay - b.startDay; });
    }
    var updated = (payload && typeof payload.updated === "string") ? payload.updated : null;
    return { byUnit: byUnit, updated: updated };
  }

  function rangesFor(index, unitId) {
    return (index && index.byUnit && index.byUnit[unitId]) ? index.byUnit[unitId] : [];
  }

  // isUnitAvailable(index, unitId, checkInDay, checkOutDay) -> boolean
  // "end" in the source data is the checkout day and is EXCLUSIVE: a booking
  // never occupies its own end date, so a new stay may check in that same
  // day. Two spans overlap only when one starts before the other ends on
  // both sides: booking.startDay < checkOutDay && booking.endDay > checkInDay.
  function isUnitAvailable(index, unitId, checkInDay, checkOutDay) {
    if (checkOutDay <= checkInDay) return false;
    var ranges = rangesFor(index, unitId);
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (range.startDay < checkOutDay && range.endDay > checkInDay) return false;
    }
    return true;
  }

  // isNightBooked(index, unitId, dayNumber) -> boolean
  // A single night is "occupied" when it falls on-or-after the booking's
  // start and strictly before its (exclusive) checkout day.
  function isNightBooked(index, unitId, dayNumber) {
    var ranges = rangesFor(index, unitId);
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if (range.startDay <= dayNumber && dayNumber < range.endDay) return true;
    }
    return false;
  }

  // availableUnitsOn(index, unitIds, checkInDay, checkOutDay) -> array,
  // preserving the order of the input unitIds.
  function availableUnitsOn(index, unitIds, checkInDay, checkOutDay) {
    var result = [];
    for (var i = 0; i < unitIds.length; i++) {
      if (isUnitAvailable(index, unitIds[i], checkInDay, checkOutDay)) result.push(unitIds[i]);
    }
    return result;
  }

  // countAvailableNight(index, unitIds, dayNumber) -> integer
  function countAvailableNight(index, unitIds, dayNumber) {
    var count = 0;
    for (var i = 0; i < unitIds.length; i++) {
      if (!isNightBooked(index, unitIds[i], dayNumber)) count++;
    }
    return count;
  }

  // nextAvailableDate(index, unitId, fromDay, nights) -> earliest day-number
  // >= fromDay where a stay of `nights` nights is fully available, searching
  // at most MAX_SEARCH_DAYS days ahead. Returns null if none is found.
  function nextAvailableDate(index, unitId, fromDay, nights) {
    var stayNights = (typeof nights === "number" && nights > 0) ? nights : 1;
    for (var offset = 0; offset < MAX_SEARCH_DAYS; offset++) {
      var checkIn = fromDay + offset;
      var checkOut = checkIn + stayNights;
      if (isUnitAvailable(index, unitId, checkIn, checkOut)) return checkIn;
    }
    return null;
  }

  // nextOpenNight(index, unitIds, fromDay, nights) -> earliest day-number
  // >= fromDay on which AT LEAST ONE unit in `unitIds` can host the whole stay.
  //
  // The scope-aware sibling of nextAvailableDate. The class-first calendar opens
  // on a class, not on a single rig, so "the next free night for Class C" has to
  // mean "any one of the four" — not "all four", and not "whichever one happens
  // to be first in the array". Returns null for an empty scope, or if nothing
  // opens within MAX_SEARCH_DAYS.
  function nextOpenNight(index, unitIds, fromDay, nights) {
    if (!unitIds || unitIds.length === 0) return null;
    var stayNights = (typeof nights === "number" && nights > 0) ? nights : 1;
    for (var offset = 0; offset < MAX_SEARCH_DAYS; offset++) {
      var checkIn = fromDay + offset;
      var checkOut = checkIn + stayNights;
      for (var i = 0; i < unitIds.length; i++) {
        if (isUnitAvailable(index, unitIds[i], checkIn, checkOut)) return checkIn;
      }
    }
    return null;
  }

  // monthGrid(year, month, options) -> { year, month, label, weeks }
  // `month` is 1-12. `weeks` is Sunday-first, padded with null outside the
  // month. options.today (a day-number) marks earlier cells as inPast.
  function monthGrid(year, month, options) {
    var opts = options || {};
    var firstDayNumber = Math.floor(Date.UTC(year, month - 1, 1) / MS_PER_DAY);
    var firstWeekday = new Date(firstDayNumber * MS_PER_DAY).getUTCDay();
    var daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    var hasToday = typeof opts.today === "number";

    var cells = [];
    for (var pad = 0; pad < firstWeekday; pad++) cells.push(null);
    for (var day = 1; day <= daysInMonth; day++) {
      var dayNumber = firstDayNumber + (day - 1);
      cells.push({
        day: day,
        date: dayNumber,
        inPast: hasToday ? dayNumber < opts.today : false
      });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    var weeks = [];
    for (var i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    return {
      year: year,
      month: month,
      label: MONTH_NAMES[month - 1] + " " + year,
      weeks: weeks
    };
  }

  global.RVAvailability = {
    parseDate: parseDate,
    formatDate: formatDate,
    indexBookings: indexBookings,
    isUnitAvailable: isUnitAvailable,
    isNightBooked: isNightBooked,
    availableUnitsOn: availableUnitsOn,
    countAvailableNight: countAvailableNight,
    nextAvailableDate: nextAvailableDate,
    nextOpenNight: nextOpenNight,
    monthGrid: monthGrid
  };
}(typeof globalThis !== "undefined" ? globalThis : this));
