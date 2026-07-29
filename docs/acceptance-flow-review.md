# Read-only acceptance flow review

Date: 2026-07-21  
Evidence: `docs/acceptance-flow-evidence.json` from the local in-app-browser preview.

| Flow | Observed evidence |
|---|---|
| Home → booking | Documentary hero and Book a farm experience CTA resolve to the Experiences route; featured Square products remain visible. |
| Experiences | 7 cards render after generated feed load; 5 cards expose Square CTAs and 2 expose Ask the farm inquiry buttons; form and fallback are present. |
| Stay/RV | BYO farm-side stay and Supplied RV rental choices are visible; dates/form/status paths are present without submission. |
| Animals / Herd | 8 Animals groups render; Herd chapter exposes same-origin browser iframe and quiz entry. |
| Shop | 24-card bounded first chunk renders; Square checkout links are visible for inspection, never opened. |
| 404 / legacy / thanks | Branded utility H1s, route matrix, redirects, and thanks artifact are present; no form or external side effect exercised. |

No form was submitted, no lead/event was sent, and no Square destination was opened. `node scripts/acceptance-flow-audit.mjs` PASS. Live response/edge checks remain S15 deployment work.
