# Tapestry Acres — "Come Meet the Herd"

A game-like, scroll-through website for Tapestry Acres (110-acre heritage-breed farm, Monroe TN).
Single static page — no build step. Hosted on GitHub Pages.

## Build and validate

Requires Node.js 20 or newer; no package installation is needed.

```powershell
npm run build
npm run validate
```

The build validates every declared HTML route and JSON data input before writing `dist/`. It emits `dist/route-manifest.json` (the sorted route/file inventory), `dist/asset-manifest.json` (the copied-asset manifest with byte sizes and SHA-256 hashes), and a catalog pack under `dist/data/`: `featured-products.json`, a SHA-256-addressed full catalog referenced by `catalog-index.json`, and its category facets. Featured SKU choices live explicitly in `src/featured-skus.json`; when a listed SKU is absent, the build fills the slot from catalog SKUs in ascending order. The pack preserves 242 product families, all 830 SKU records, and every Square checkout URL. The canonical host-independent base path is `/s/tapestry-acres`, defined in `src/base-path.mjs`; add future static inputs under `public/`.

Run `npm run verify` to build twice, compare the manifests and generated catalog data byte-for-byte, and validate the final output. Run `npm test` to exercise the catalog-output assertions with the existing test suite.

## Live site
https://trashpanda62.github.io/tapestry-game/

## Edit it yourself (in the browser, on any device)
Open the site with `?edit` on the end of the URL:
**https://trashpanda62.github.io/tapestry-game/?edit**

- Drag the glowing pips & lanterns onto the animals
- Click any text to rewrite it
- 📷 swap or **⤴ upload** a photo per scene, and set plaque align (L/C/R)
- **💾 Export** downloads `edits.js`

To publish your changes for everyone: replace `edits.js` in this repo with the exported one
(on a phone: open the repo on github.com → `edits.js` → upload/replace → commit). GitHub Pages
redeploys in ~1 minute. See `HOW-TO-EDIT.md` for the full guide.
