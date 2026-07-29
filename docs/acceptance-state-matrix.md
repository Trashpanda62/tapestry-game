# Acceptance state matrix

Date: 2026-07-21  
Scope: final locked dist artifact.

| State / stressor | Evidence | Result |
|---|---|---|
| Loading | Shared skeleton cards, `aria-busy`, status copy | PASS |
| Empty | Catalog/experience/animal empty copy, unavailable photo branch | PASS |
| Error | Alert/error regions and retry/contact guidance | PASS |
| Success | Authoritative lead confirmation and form state transition | PASS |
| Offline / slow | Herd SW cache fallback, catalog catch/error, no infinite loading | PASS |
| Stale cache | Versioned Herd cache namespace and release pointer | PASS |
| Double click / repeat beacon | Beacon → keepalive fallback plus server dedupe fixtures | PASS |
| Double submit | Honeypot/required/rate-limit/authoritative lead path | PASS |
| Invalid path | Normalize/reject traversal; branded 404 and legacy 308 map | PASS |
| Mobile / desktop | 40 viewport probes and eight captures | PASS |
| Reduced motion | Shared and Herd media-query overrides | PASS |
| Silent default config | Exact eight-axis lock on every production route; selector stripped | PASS |

`node scripts/acceptance-state-audit.mjs` PASS. The acceptance run did not submit forms or send test events.
