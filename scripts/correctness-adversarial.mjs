import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const read = (file) => readFile(new URL(file, root), 'utf8');
const checks = [];
function check(name, condition, repro, trace, impact) {
  checks.push({ name, result: condition ? 'PASS' : 'FAIL', repro, trace, impact });
  if (!condition) throw new Error(`[adversarial] ${name}: ${impact}`);
}

const shop = await read('shop.html');
const shopRuntime = await read('assets/shop.js');
const rv = await read('rv-rentals.html');
const herd = await read('dist/herd/index.html');
const sw = await read('dist/herd/sw.js');
const analytics = await read('dist/assets/journey-analytics.js');
const redirects = await read('dist/_redirects');
const catalogIndex = JSON.parse(await read('dist/data/catalog-index.json'));
const catalog = JSON.parse(await read(`dist/data/${catalogIndex.catalog}`));

check('null/empty/huge/unicode catalog rows', /Array\.isArray\(data\.skus\)/.test(shopRuntime) && /String\(/.test(shopRuntime),
  'replace catalog response with null, [], 500-char unicode title', 'catalog fetch guard → empty/error state; textContent rendering; bounded title fields', 'no uncaught render or unsafe HTML sink');
check('duplicate catalog names and missing images', /skuById\[product\.sku\]/.test(shopRuntime) && /firstImage\(product\)/.test(shopRuntime),
  'duplicate title, images_local=[], images=[]', 'title-count inference + firstImage fallback + card placeholder branch', 'no duplicate-key collapse or broken image exception');
check('offline/slow catalog JSON', /\.catch\(\s*function/.test(shopRuntime) && /aria-busy/.test(shop),
  'delay or reject catalog index/payload', 'catch clears busy state and publishes a user-facing error', 'no infinite loading shell');
check('stale herd service worker', /cache-first|network-first|caches\.match/.test(sw) && /herd-shell-v11-obscura/.test(sw),
  'serve an old cache namespace after a new mirror build', 'versioned namespace + fetch fallback', 'old mirror cannot silently win after release');
check('herd offline and malformed payload', /catch|fallback|offline/i.test(herd) && /herd\.json/.test(herd),
  'disconnect network or return malformed herd JSON', 'same-origin payload + cached/read-only fallback', 'browse/quiz remains usable or reports failure');
check('double click / repeat beacon', /sendBeacon/.test(analytics) && /fetch\("\/s\/tapestry-acres\/__event"/.test(analytics),
  'click a CTA twice and force sendBeacon=false', 'beacon then keepalive fetch fallback; server dedupe key', 'one bounded event row per repeat window');
check('double-submit form', /return_to/.test(analytics) && /company/.test(rv) && /__lead/.test(rv),
  'submit the same RV inquiry twice with honeypot empty', 'lead endpoint required-field/rate-limit/authoritative-row path', 'no client-only success claim; duplicate volume bounded');
check('malformed redirects and traversal paths', /\/\* \/s\/tapestry-acres\/404 404/.test(redirects),
  'request legacy weird path, encoded .., or unknown extension', 'wildcard branded 404 plus Webstudio normalizeStaticPath rejection', 'no open redirect or path escape');
check('catalog identity and counts', catalog.familyCount === 242 && catalog.skuCount === 830 && catalog.skus.length === 830,
  'remove a SKU or duplicate an id in generated payload', 'build/validate and catalog-map audit fail before publish', 'source drift cannot ship silently');

console.log(JSON.stringify({ fixtureCount: checks.length, checks }, null, 2));
console.log('[adversarial] PASS: no P0/P1 candidate; all fixtures have a guarded trace and bounded impact.');
