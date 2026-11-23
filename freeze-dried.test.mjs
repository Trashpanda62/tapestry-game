import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./freeze-dried.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(/<title>[^<]*Freeze Dried[^<]*Monroe TN[^<]*<\/title>/i.test(html), 'title must name freeze dried candy and Monroe TN');
assert(/<h1\b[^>]*>[^<]*freeze dried/i.test(html), 'h1 must name freeze dried candy');
// The word is never a product name (Mars mark); the page may not use it at all.
assert(!/skittles/i.test(html), 'the page must not use the word Skittles');
assert(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']https:\/\/trashpanda62\.github\.io\/tapestry-game\/freeze-dried\.html["']/i.test(html), 'canonical must be the freeze-dried route');
assert(html.includes('Crunchy Rainbows') && html.includes('Crunchy Boulders'), 'both products must be named');
// Only documented prices: Crunchy Rainbows 4 oz at $8.99 (line sheet). Boulders has no confirmed price.
const prices = html.match(/class="fd-price">[^<]*</g) || [];
assert(prices.length === 2, `expected 2 price lines, found ${prices.length}`);
assert(prices.some((p) => p.includes('$8.99')) && prices.some((p) => p.includes('Ask us')), 'price lines must be $8.99 and Ask us');
assert(html.includes('src="assets/storefront.js"') && html.includes('S.live()'), 'Square items must replace the static cards when they exist');
assert(/<img\b[^>]*\balt="[^"]{10,}"/i.test(html), 'label image needs descriptive alt text');
assert(/<nav\b[^>]*id="site-nav"[\s\S]*?href="freeze-dried\.html" aria-current="page"/i.test(html), 'nav must mark the freeze dried page current');

console.log('PASS: freeze-dried page content, price lines, Square override, and nav checks');
