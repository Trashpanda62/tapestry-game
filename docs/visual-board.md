# Visual / UX regression board

Date: 2026-07-21  
Scope: eight generated routes × 320, 375, 768, 1024, and 1440px viewport probes.

| Probe | Result |
|---|---|
| 320px narrow mobile | PASS — no horizontal overflow; hero, nav, cards, forms, dialogs remain in bounds |
| 375px mobile | PASS — no overflow; primary CTA and trust line remain visible in the first viewport |
| 768px tablet | PASS — responsive grids collapse without orphaned controls |
| 1024px desktop | PASS — two-column editorial/stay layouts hold hierarchy |
| 1440px wide desktop | PASS — max-width shells preserve readable line length and CTA dominance |
| Loading / empty / error / success | PASS — shared skeletons, status regions, error/empty copy, confirmation states present |
| Menu / dialog / sticky controls | PASS — layering and focus styling covered by keyboard audit |
| Long catalog / animal / RV data | PASS — bounded catalog chunks, responsive cards, and text wrapping checks green |

The in-app browser ran 40 live viewport probes with zero overflow findings and captured representative states:

- [Home mobile](home-mobile.png) · [Experiences mobile](experiences-mobile.png) · [Shop mobile](shop-mobile.png) · [Herd mobile](herd-mobile.png)
- [Home desktop](home-desktop.png) · [Experiences desktop](experiences-desktop.png) · [Shop desktop](shop-desktop.png) · [Herd desktop](herd-desktop.png)

`node scripts/visual-regression-audit.mjs` is the repeatable artifact gate. Exact device/browser visual diffs remain part of final acceptance because this runtime cannot provide a full screenshot diff service.
