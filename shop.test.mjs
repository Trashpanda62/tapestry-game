import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./shop.html', import.meta.url), 'utf8');
const script = await readFile(new URL('./assets/shop.js', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

for (const id of ['product-search', 'search-suggestions', 'filter-tabs', 'facet-groups', 'mobile-filter-drawer', 'product-detail', 'product-grid', 'load-more']) {
  assert(html.includes(`id="${id}"`), `missing shop control ${id}`);
}
for (const needle of [
  "fetch('data/catalog-index.json'",
  'searchScore',
  'editDistance',
  'setTimeout(function () { writeUrl(\'replace\'); render(); }, 90)',
  'category: [], price: [], size: [], color: [], availability: []',
  'facetCount',
  'history.pushState',
  'window.addEventListener(\'popstate\'',
  'showModal',
  'event.key === \'Escape\'',
  'event.key !== \'Tab\'',
  'tapestry-bag-v1',
  'priceCents',
  "' matching '"
]) {
  assert(script.includes(needle), `missing S4 behavior ${needle}`);
}
assert(/aria-controls="search-suggestions"/.test(html), 'search input is not connected to suggestions');
assert(/aria-haspopup="dialog"/.test(html), 'mobile filter trigger is not dialog-labelled');
assert(!/data-legacy-catalog-renderer/.test(html), 'stale legacy shop renderer remains in source');
assert(!/square\.link/i.test(html + script), 'external Square checkout remains in the shop surface');

// The card is a browsing tile. It printed the raw internal SKU at shoppers
// ("Selected: TAP-WIX-ALPACAPRINTCREWS-LARGEXLBEIGERED") and carried both variant
// dropdowns, which is what made it ~790px tall and pushed the price out of line.
assert(!/'Selected: ' \+ product\.sku/.test(script), 'the card prints the internal SKU at customers again');
assert(/function optionSummary/.test(script), 'the card lost its human-readable option summary');
assert(/buildVariantControls\(copy, family, selected, update\)/.test(script), 'quick view lost its variant controls');
assert(!/buildVariantControls\(body,/.test(script), 'variant selects are back on the grid card');
// Fixed rows are the whole mechanism behind aligned prices: reserving two lines for the
// title is what stops a one-line and a three-line title putting their prices 50px apart.
assert(/\.product-body\{display:grid;grid-template-rows:auto auto 1fr auto/.test(html), 'the card body is no longer a fixed-row grid');
assert(/\.product-title\{[^}]*min-height:2\.4em/.test(html), 'the card title no longer reserves two lines');
// The gallery used to promise "5 product photos" and render one of them.
assert(/gallery-thumb/.test(script) && /gallery-thumbs/.test(html), 'quick view lost its multi-photo gallery');
assert(/CRISP_MIN_PX/.test(script) && /data-fit="contain"/.test(html), 'small images are being upscaled into the card frame again');
assert(/function cleanCopy/.test(script), 'run-together words from the Wix export are no longer repaired');

console.log('PASS: S4 shop markup, fuzzy search, facets, quick view, URL state, mobile drawer, first-party bag, aligned card rows, gallery, and copy-cleanup contracts');
