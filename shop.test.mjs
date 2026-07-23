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

console.log('PASS: S4 shop markup, fuzzy search, facets, quick view, URL state, mobile drawer, and first-party bag contracts');
