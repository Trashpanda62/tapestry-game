# Final dist audit

Date: 2026-07-21  
Artifact: the release hash in `docs/acceptance-matrix.md`.

- 8 route-manifest entries, including branded 404/thanks utilities; six indexable sitemap URLs.
- 242 catalog families / 830 SKUs; 8 Animals groups; Herd 110 head / 65 named.
- Analytics bundle contains no email, phone, name, message, or address field names; public contact copy is separate from event payloads.
- Dist contains no `.raw`, selector, or preview assets; required redirects, 404, thanks, manifests, and Herd SW are present.
- Route/link, external-dependency, secret/license, catalog, adversarial, and acceptance checks all point to this artifact.

`node scripts/final-dist-audit.mjs` PASS. Working-tree dirt outside intended release changes is preserved and remains a deployment preflight concern.
