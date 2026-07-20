import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./shop.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(html.includes("fetch('store-products.json',{cache:'no-cache'})"), 'missing store-products.json fetch');
assert(/<div\b[^>]*\bid=["']product-grid["'][^>]*>[\s\S]*?<article class=["']skeleton-card["'] aria-hidden=["']true["']><\/article>[\s\S]*?<\/div>[\s\S]*?fetch\(['"]store-products\.json['"],\{cache:['"]no-cache['"]\}\)/i.test(html), 'loading skeleton markup is missing before shop data loads');

// Group mapping: every real Wix collection name (from wix-export/collections.json,
// 2026-07-20 capture) plus the legacy Etsy-era category vocabulary must resolve to
// one of the 8 locked top-level groups via COLLECTION_TO_GROUP.
const groupMapMatch = html.match(/COLLECTION_TO_GROUP=\{([\s\S]*?)\};/);
assert(groupMapMatch, 'missing COLLECTION_TO_GROUP mapping object');
const groupMapBody = groupMapMatch[1];
const REAL_COLLECTIONS = [
  'Accessories', 'All Natural Soaps', 'Alpaca Lace Yarns', 'Baby Chunky Alpaca', 'Bags',
  'Bath Bombs & Salts', 'Blankets', 'Cascade Yarns', 'Christmas', 'Dress Socks',
  'Fingerless Mittens and Gloves', 'Gift Certificates', 'Gloves', 'Hats', 'Household',
  'Kids Things', 'Luna', 'Luna Paints', 'Mittens', 'My Comfy Socks',
  'New England Alpaca Fiber Pool', 'our faves', 'Outdoors Socks', 'Paca Socks',
  'Pure Alpaca Yarns', 'Rabat', 'Roving', 'Salar Yarns', 'Scarves', 'Scrubs',
  'Seasonal Specials', 'Simply Natural', 'Slipper Socks', 'Soaps, Scrubs & Bath',
  'Socks', 'Sport Socks', 'Stuffies', 'Sweaters', 'Washcloth Soap', 'Wax Tart Melts',
];
for (const collection of REAL_COLLECTIONS) {
  assert(groupMapBody.includes(`'${collection}':`), `collection "${collection}" is not mapped to a shop group`);
}
assert(groupMapBody.includes("'Roving':'Yarn & Fiber'"), 'Roving must map to the Yarn & Fiber group');
const GROUPS = ['Socks', 'Yarn & Fiber', 'Apparel & Accessories', 'Bath & Body', 'Stuffies & Kids', 'Blankets & Home', 'Gift Certificates', 'Seasonal'];
for (const group of GROUPS) {
  assert(html.includes(`'${group}'`), `group "${group}" is not referenced in the GROUPS chip list`);
}
assert(html.includes('function groupFor(product)'), 'missing groupFor(product) group-resolution function');
assert(/activeFilter===['"]All['"]\|\|groupFor\(product\)===activeFilter/.test(html), 'filter matching does not use groupFor(product) against activeFilter');

// Chunked render + Load more, reset on filter/search change.
assert(/CHUNK_SIZE\s*=\s*24/.test(html), 'chunk size is not 24');
assert(/renderedCount\s*=\s*CHUNK_SIZE/.test(html), 'missing initial renderedCount = CHUNK_SIZE');
assert(/matches\.slice\(0,renderedCount\)/.test(html), 'missing chunked slice of matches to renderedCount');
assert(/id=["']load-more["']/.test(html), 'missing load-more button');
assert(/loadMoreBtn\.hidden\s*=\s*matches\.length<=renderedCount/.test(html), 'load-more visibility does not depend on remaining matches');
assert(/loadMoreBtn\.addEventListener\(['"]click['"],function\(\)\{renderedCount\+=CHUNK_SIZE;render\(\);\}\)/.test(html), 'load-more click handler does not advance renderedCount by CHUNK_SIZE');
assert(/search\.addEventListener\(['"]input['"],function\(\)\{renderedCount=CHUNK_SIZE;render\(\);\}\)/.test(html), 'search input does not reset renderedCount before re-rendering');
assert(/renderedCount=CHUNK_SIZE;tabs\.querySelectorAll/.test(html), 'selecting a filter does not reset renderedCount');

// images_local: card image prefers the optimized local webp, falls back to the
// Square-hosted url (some legacy rows may lack images_local).
assert(html.includes('function firstImage(product)'), 'missing firstImage(product) helper');
assert(/product\.images_local&&product\.images_local\[0\]/.test(html), 'firstImage does not check images_local first');
assert(/product\.images&&product\.images\[0\]/.test(html), 'firstImage does not fall back to images[0]');
assert(/image\.width=400;image\.height=300/.test(html), 'product card image is missing explicit width/height to avoid layout shift');

assert(/<input\b(?=[^>]*\bid=["']product-search["'])(?=[^>]*\btype=["']search["'])(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'product search input is missing an aria-label');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?image\.alt\s*=\s*product\.title/.test(html), 'rendered product images are missing non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

assert(/buy\.href\s*=\s*product\.checkout_url/.test(html), 'Buy button does not use checkout_url as its href source');
assert(/Number\(product\.qty\)\s*<=\s*0&&!isUntrackedInventory\(product\)[\s\S]*disabled\.disabled\s*=\s*true/.test(html), 'missing sold-out disabling logic for qty <= 0 (excluding untracked-inventory items)');
assert(html.includes('function isUntrackedInventory(product)'), 'missing isUntrackedInventory(product) helper (the feed has no track_inventory field -- untracked multi-variant items must be inferred from a shared title appearing more than once)');
assert(/titleCounts\[product\.title\]=\(titleCounts\[product\.title\]\|\|0\)\+1/.test(html), 'titleCounts is not populated from the loaded feed');

// Sort control: a select offering Featured / price asc / price desc / name asc,
// wired into render() so it re-sorts before chunking (same reset-on-change pattern as search/chips).
assert(/<select\b[^>]*\bid=["']product-sort["'][^>]*>/i.test(html), 'missing product-sort select control');
for (const value of ['featured', 'price-asc', 'price-desc', 'name-asc']) {
  assert(html.includes(`value="${value}"`), `missing sort option value="${value}"`);
}
assert(html.includes("SORTERS={"), 'missing SORTERS sort-function map');
assert(/sortSelect\.addEventListener\(['"]change['"],function\(\)\{activeSort=sortSelect\.value;renderedCount=CHUNK_SIZE;render\(\);\}\)/.test(html), 'sort change handler does not reset renderedCount before re-rendering');
assert(/var sorter=SORTERS\[activeSort\];[\s\S]{0,20}if\(sorter\)matches=matches\.slice\(\)\.sort\(sorter\)/.test(html), 'render() does not apply the active sorter to the filtered matches before chunking');

assert(html.includes('No products match your filters.'), 'missing filtered empty-state message');
assert(html.includes('No products are available right now.'), 'missing unavailable-products empty-state message');
assert(html.includes('We could not load the shop right now. Please try again later.'), 'missing fetch-failure message');

console.log('PASS: shop data, group mapping, chunked load-more, search, checkout, stock, and status message checks');
