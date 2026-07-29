# Tapestry Obscura live deployment smoke

Date: 2026-07-21 · accepted bundle: `83dc83bcc6da1cdfa5e27ef5e1d1e2410a6775615415ef3ba0ef84541bddbb7d` · slug: `tapestry-acres` · origin: `https://sites.obscurastudio.design`

## Release and infrastructure

- Webstudio commits deployed: `3174699`, `28f7d61`, `7669046`, `c3a0ccc`, `fc021aa` (isolated detached worktree; only reviewed files committed; Impeccable cache excluded).
- Remote Docker build: PASS after removing the verified obsolete `src/app/api/sites/[id]/kb-records/route.ts` source artifact; Next typecheck/build completed.
- Container health: app, Postgres, and MinIO running; entrypoint reported 21 migrations found and **No pending migrations to apply**.
- Cloudflare tunnel: PASS, `sites.obscurastudio.design` routes to the Webstudio app.
- Active pointer after proof: `83dc83bcc6da1cdfa5e27ef5e1d1e2410a6775615415ef3ba0ef84541bddbb7d`.
- Visual correction: production HTML now declares `<base href="/s/tapestry-acres/">`, so CSS, scripts, images, and data fetches resolve from the tenant root when the extensionless URL has no trailing slash.

## Public smoke

| Surface | Result |
| --- | --- |
| Home, `/experiences`, `/shop`, `/animals`, `/stay`, `/herd`, `/thanks` | HTTP 200; HTML title and exact lock attrs present |
| `/sitemap.xml`, `/robots.txt` | HTTP 200; cache max-age 300 |
| Invalid path | HTTP 404; branded 404 HTML |
| Legacy `/rv-rentals.html` | HTTP 301 to public `/stay` URL |
| Static CSS asset | HTTP 200 |
| Mobile visual QA | PASS at 375×667 in the in-app browser; styled header, hero image, slab typography, CTA buttons, and responsive nav visible |
| Exact lock | `documentary / pasture-ochre / sturdy-slab / painted-sign / accent / comfortable / lively / rail` |
| Experience JSON | 7 cards; 5 Square URLs; 2 inquiry fallbacks |
| Catalog JSON | 830 SKUs; sampled first 24 include Square checkout URLs |
| Invalid lead payload | HTTP 400; no lead created |
| Invalid event payload | HTTP 400 validation response; forwarded public origin accepted |
| CSP | No response CSP header; documented as deployment-header hardening follow-up, not a release blocker |

## Rollback proof

No previous active release existed before this publish. A separate `rollback-fixture` release was uploaded, activated, and smoke-checked (HTTP 200, exact lock), then the accepted release pointer was re-activated and verified. No release objects were deleted.
