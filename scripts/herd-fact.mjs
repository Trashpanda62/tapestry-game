/**
 * Shared herd-export helpers used by the animal-pool generator, the content
 * pack build, and the Farm Steward audit so the "verified fact" rule can
 * never drift between them.
 */

/** A verified fact is the herd note with the trailing wiki-link block cut off. */
export function deriveFact(notes) {
  return String(notes || "").split("[[")[0].replace(/\s+/g, " ").trim();
}

/** Species labels come from the herd export verbatim; guard against encoding drift. */
export function normalizeSpecies(raw) {
  const value = String(raw || "").replace(/\s+/g, " ").trim();
  if (/^Belted Galloway\b/.test(value)) return "Belted Galloway × Jersey";
  return value;
}

/** Clue rounds only quote facts specific enough to identify one animal. */
export function isClueEligible(fact) {
  return typeof fact === "string" && fact.length >= 25;
}
