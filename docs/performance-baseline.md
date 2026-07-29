# Performance baseline — G3

Date: 2026-07-21 · artifact: deterministic `dist/` after `npm run build`.

| Route | HTML bytes | Local first-party requests | Static bytes |
|---|---:|---:|---:|
| Home | 16,802 | 9 | 522,936 |
| Experiences | 14,522 | 5 | 43,274 |
| Shop | 18,539 | 5 | 47,291 |
| Herd chapter | 124,608 | 23 | 4,750,469 |

Interaction checks: Shop renders at a bounded 24-item chunk and does not parse the full catalog on Home; Herd service worker is 2,091 bytes, same-origin scoped, and uses the versioned `herd-shell-v11-obscura` cache namespace.

LCP/CLS/INP/long-task values are explicitly `N/A`: the in-app browser page context exposes no `PerformanceObserver`/performance-entry API. This is a measurement-environment limitation, not a fabricated pass; a real-device Lighthouse/CrUX run remains a pre-deploy follow-up. Full deterministic bytes, request counts, interaction guards, and all functional audits pass via `npm run test:performance` and `npm run check`.
