# Claim/source authority matrix

| Retained claim/data | Authority checked | Scope/route | Conflict rule |
|---|---|---|---|
| 110-acre farm, Monroe TN, family/working-farm identity | `C:\dev\tapestry-game\README.md`; `C:\dev\tapestry-game\index.html`; live Obscura baseline above | Home/about narrative | Use only wording present in source; no invented biographies |
| Experiences, names, prices, durations, booking links | `C:\dev\tapestry-game\experiences.json` (7 records; 5 Square-linked per S0 count target) | Visit/experiences | JSON is data authority; unknown values route to inquiry |
| Animal groups, names, for-sale fields | `C:\dev\tapestry-game\animals.json` (8 groups per S0 count target) | Animals | Preserve spellings/nulls; no fabricated prices |
| Product families, variants, prices, stock, Square URLs | `C:\dev\tapestry-game\store-products.json` (830 SKU target) | Shop | Source JSON + Square destination allowlist; never reprice |
| RV photos, request flow, current live values | `C:\dev\tapestry-game\rv-rentals.html` plus current Obscura `/s/tapestry-acres/rv-rentals` | Stay/RV | Current live Obscura values win over stale plan text; discrepancies fail data gate |
| Herd browser/quiz behavior | Read-only `C:\dev\tapestry-herd` checkout and export | Meet the Herd | Consume read-only; do not overwrite dirty source |
| Area/directions data | Read-only `C:\dev\tapestry-area-map` checkout | Contact/location | Same-origin bundle or direct directions link; no required third-party iframe |
| Photos and illustration rights | `C:\dev\tapestry-game\assets\CREDITS.txt` and per-asset source notes | All visual routes | No generated humans/documentary scenes; retain provenance |

The matrix is the S0 authority ledger. Any source disagreement is recorded and resolved before data/build acceptance; no silent third value.
