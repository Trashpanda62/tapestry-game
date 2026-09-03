# RV admin calendar — acceptance record

Run 2026-07-30. Covers the passcode-gated availability editor at `/rv-admin` and the
switch of the public stay calendar from a baked `bookings.json` to a live platform read.

## Suites

| Suite | Command | Exit | Result |
|---|---|---|---|
| Tapestry bundle gates | `npm run check` (in `C:\dev\tapestry-game`) | **0** | full chain green |
| Platform unit tests | `npx vitest run` (in `C:\dev\webstudio-tapestry-obscura-redesign`) | **0** | 39 files / 415 tests passed |
| RV admin crypto + validation | `npx vitest run test/rvAdmin.test.ts` | **0** | 15 tests passed |

TypeScript: the platform repo carries **15 pre-existing errors, all under `test/`**. Verified
by stashing this change — 15 before, 15 after, and 0 under `src/`. This work adds none.

## Gates updated, and why

Three gates pinned the old route count and failed correctly when `/rv-admin` was added. Each
was updated to the new truth rather than loosened:

- `scripts/route-matrix.mjs` — canonical route list, 11 → 12 entries.
- `scripts/acceptance-gate.mjs` — `ROUTES` row, `length === 11` → `=== 12`.
- `scripts/final-dist-audit.mjs` — route-count drift assertion, 11 → 12.

`scripts/rv-audit.mjs` gained four assertions covering the live-read/fallback contract.

## Verified behaviour

**Grid** (driven in-browser against a stubbed API, `dist` served locally):
- 6 unit rows × 90 day columns; unit names resolve from the fleet ids.
- An existing `max-2` 2026-09-06 → 2026-09-09 block renders as exactly **3** nights,
  confirming the exclusive-checkout-day semantics survive the expand/compact round trip.
- A drag across 6 cells paints 6 nights. Re-dragging over the same run does **not** smear —
  each move recomputes from the pre-drag snapshot.
- Save compacts to the correct ranges (`2026-08-02` → `2026-08-08` = 6 nights) and sends the
  `x-rv-admin: 1` CSRF header. An existing note survived the round trip.
- Keyboard: space toggles, shift+arrow extends, arrows move focus.
- Mobile at 375px: 38×42px cells, zero controls under 44px, no page-level horizontal scroll
  (the grid scrolls inside its own container).

**Public calendar fallback** — verified for real, not simulated. The static preview server has
no `/api/rv/blocks` at all, so the page load exercised the fallback path genuinely: the
calendar still rendered 35 day cells from the bundled `bookings.json` and stayed visible.

## Defects found during verification

All three were caught by measurement, not by eye, and all are fixed:

1. **Range label a day behind.** `toLocaleDateString` formatted a UTC midnight in local time,
   so the header read "Jul 29" on 2026-07-30. Fixed by passing `timeZone: 'UTC'`.
2. **Screen readers announced the wrong state.** `repaintCells` updated `aria-pressed` but not
   `aria-label`, so a just-blocked night still read "available".
3. **Homoglyph identifier.** A Cyrillic `С` (U+0421) had crept into `runCount`. It ran only
   because every occurrence was misspelled identically; normalised to ASCII.

Two test-quality problems were also caught and corrected: a mutation probe that passed
vacuously (deleting the `!stored` guard changes nothing, because the parts-length check
already rejects an empty hash), and a `tsc --noEmit exits 0` check that could never pass in
this repo.

## Mutation testing

Guards were confirmed to actually fire rather than pass vacuously:

- Removing the cross-site token check in `verifyRvToken` → exactly one test fails
  (`rejects a token when checked against a different siteId`), 14 pass.
- Pointing the calendar's fallback at a missing file → `npm run test:rv` fails with
  "the baked bookings.json fallback was removed".

## Not covered here

The endpoints are unit-tested at the crypto and validation layer, not through a live HTTP
round trip — that happens at the live-verification step after deploy, which is gated on
Steve's approval because `webstudio-app-1` also serves Livingston, Harris Wellness, portfolio
and power-chart.
