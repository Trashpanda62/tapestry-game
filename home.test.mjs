import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(/<section\b[^>]*\bclass=["'][^"']*\bhero\b[^"']*["'][^>]*>/i.test(html), 'missing hero section');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?img\.alt\s*=\s*alt/.test(html), 'rendered images are missing non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');
assert(html.includes("fetch('experiences.json',{cache:'no-cache'})"), 'missing experiences.json fetch');
assert(html.includes("fetch('store-products.json',{cache:'no-cache'})"), 'missing store-products.json fetch');

const planSection = html.match(/<section\b[^>]*\baria-labelledby=["']plan-title["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || '';
const planCards = planSection.match(/<a\b[^>]*\bclass=["'][^"']*\bhub-card\b[^"']*["'][^>]*>/gi) || [];
assert(planCards.length >= 4, 'fewer than 4 Plan your visit cards');

for (const href of ['experiences.html', 'shop.html', 'meet-the-herd.html', 'rv-rentals.html']) {
  assert(planCards.some((card) => card.includes(`href="${href}"`)), `missing Plan your visit card link: ${href}`);
}

assert(/<header\b[^>]*\bclass=["'][^"']*\bsite-header\b[^"']*["'][^>]*>/i.test(html), 'missing shared site-header');
assert(/<footer\b[^>]*>/i.test(html), 'missing footer');
assert(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']https:\/\/trashpanda62\.github\.io\/tapestry-game\/["'][^>]*>/i.test(html), 'canonical link does not point to the site root');

console.log('PASS: home hero, visit cards, shared layout, and canonical checks');
