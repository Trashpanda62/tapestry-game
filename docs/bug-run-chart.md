# Bug-run chart — G1

| ID | Severity | Repro | Root cause | Minimal fix | Exact rerun | Adjacent rerun | Status |
|---|---|---|---|---|---|---|---|
| G1-001 | P1 | Load Home on a clean published bundle; featured experiences stays in fallback copy and console reports a missing `experiences.json` | Home still referenced the retired source feed while the deterministic build emits `data/experiences.v1.json` envelope | Changed Home to fetch the generated envelope and unwrap `payload.data`; updated stale source contract assertions | `npm run build && npm test` → 12/12 PASS | `npm run check` → full build/verify/content/catalog/selector/visual/external/adversarial suite PASS | CLOSED |
| G1-002 | P2 (test drift) | Legacy contract tests expected pre-S2 feed paths and pre-polish control text | Tests were not updated when generated feeds and “Ask the farm” fallback shipped | Updated assertions to current generated paths and bounded controls; no runtime behavior change | `npm test` → 12/12 PASS | `npm run test:adversarial` → 9/9 PASS | CLOSED |

No P0/P1 defects remain open. No destructive cleanup or data mutation was performed.
