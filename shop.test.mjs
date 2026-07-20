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
assert(/product\.category[\s\S]*product\.subcategory/.test(html), 'missing category/subcategory filter mechanism');

assert(/<input\b(?=[^>]*\bid=["']product-search["'])(?=[^>]*\btype=["']search["'])(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'product search input is missing an aria-label');
assert(html.includes("search.addEventListener('input',render)"), 'product search input is not wired to a JavaScript handler');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?image\.alt\s*=\s*product\.title/.test(html), 'rendered product images are missing non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

assert(/buy\.href\s*=\s*product\.checkout_url/.test(html), 'Buy button does not use checkout_url as its href source');
assert(/Number\(product\.qty\)\s*<=\s*0[\s\S]*disabled\.disabled\s*=\s*true/.test(html), 'missing sold-out disabling logic for qty <= 0');

assert(html.includes('No products match your filters.'), 'missing filtered empty-state message');
assert(html.includes('No products are available right now.'), 'missing unavailable-products empty-state message');
assert(html.includes('We could not load the shop right now. Please try again later.'), 'missing fetch-failure message');

console.log('PASS: shop data, filters, search, checkout, stock, and status message checks');
