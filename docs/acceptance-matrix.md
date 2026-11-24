# Acceptance matrix

Release hash: `57b95ca04bac91f9b78e11512927976e7552d913bd469e6482cb6723970051bb`  
Artifact files: 812  
Artifact bytes: 36516094

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| LOCK | Exact Steve combo baked into production HTML | PASS | design-lock + locked-visual |
| ROUTES | Canonical route manifest, branded utility routes, and the staff availability editor | PASS | route-matrix |
| EXPERIENCES | 6 source-backed experiences with embedded calendars and Square checkout | PASS | experience-audit |
| CATALOG | 242 families / 830 SKUs retain checkout identity | PASS | catalog-map |
| ANIMALS | 8 species groups with named/unnamed and for-sale distinction | PASS | animals-audit |
| HERD | 110 head / 65 named read-only mirror | PASS | herd-offline |
| ANALYTICS | Allowlisted no-PII conversion path | PASS | event-lead-security |
| SECURITY | No secrets/unexpected externals/adversarial P0/P1 | PASS | security + adversarial gates |
| PERFORMANCE | Deterministic bytes/requests and bounded interaction budgets | PASS | performance-baseline |
| A11Y | Semantic, keyboard, screen-reader narrative and visual matrix | PASS | accessibility + keyboard + visual |
| SEO | Canonical/OG/schema/sitemap/robots/local intent | PASS | seo-audit |

This is a deterministic acceptance artifact. The release hash is computed from sorted dist paths and SHA-256 file bytes.
