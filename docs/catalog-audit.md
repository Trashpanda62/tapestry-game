# S2 catalog/data audit

- `npm run check`: PASS; 657 deterministic files; generated manifests/catalog byte-stable across two builds.
- Square checkout URLs: 830/830 valid `https://square.link/` destinations.
- Local product image refs: 3,955 checked · 0 missing.
- SKU uniqueness: 830/830 unique.
- Product families: 242; generated catalog hash is recorded in `dist/data/catalog-index.json`.
- Old `tapestryacres.com` content-nav links: 0 in shipped route sources. Remaining occurrences in `meet-the-herd.html` are visible brand text only, not anchors.
