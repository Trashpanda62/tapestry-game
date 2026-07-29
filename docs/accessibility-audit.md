# Accessibility audit

Date: 2026-07-21  
Scope: eight canonical static routes at the locked `pasture-ochre` / `painted-sign` light theme.

`node scripts/accessibility-audit.mjs` checks one H1, main/nav/skip-link landmarks, non-empty image alternatives, accessible button names, labelled form controls, safe links, duplicate IDs, no positive tabindex, shared focus-visible and reduced-motion styles, and WCAG AA-sized text contrast for the active palette.

| Pair | Contrast |
|---|---:|
| Ink on cream | 12.07:1 |
| Forest on cream | 5.51:1 |
| Accent on white | 4.96:1 |
| Muted on cream | 4.94:1 |

The deterministic audit passed. Automated axe/Lighthouse and screen-reader telemetry are not available in the in-app browser runtime; the live/device verification remains part of S14/S15 acceptance.
