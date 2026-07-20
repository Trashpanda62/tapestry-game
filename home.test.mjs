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

// Hero is locked (baked) on the "identity" combo: no live switcher, copy names both species.
assert(!html.includes('preset-switcher'), 'baked hero must not reference the retired preset-switcher');
assert(!/HERO_DATA/.test(html), 'baked hero must not retain the HERO_DATA preset map');
assert(!html.includes('PresetSwitcher.init'), 'baked hero must not retain PresetSwitcher.init');
const heroSection = html.match(/<section\b[^>]*\bclass=["'][^"']*\bhero\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || '';
assert(/alpaca/i.test(heroSection), 'hero copy must mention alpacas');
assert(/highland/i.test(heroSection), 'hero copy must mention Highland cattle');

// About/history section.
assert(/<section\b[^>]*\baria-labelledby=["']history-title["'][^>]*>/i.test(html), 'missing About/history section');
assert(html.includes('Dale and Tari Maxfield'), 'About/history section is missing the family names');
assert(html.includes('2006'), 'About/history section is missing the 2006 origin year');
assert(html.includes('2023'), 'About/history section is missing the 2023 relocation year');
assert(html.includes('Upper Cumberland'), 'About/history section is missing the Upper Cumberland Valley location');

// Gift-certificate strip: 3 real Square checkout links.
assert(/<section\b[^>]*\baria-labelledby=["']giftcert-title["'][^>]*>/i.test(html), 'missing gift-certificates section');
const giftSection = html.match(/<section\b[^>]*\baria-labelledby=["']giftcert-title["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || '';
const giftLinks = giftSection.match(/href="(https:\/\/square\.link\/u\/[^"]+)"/g) || [];
assert(giftLinks.length === 3, `expected 3 Square gift-certificate links, found ${giftLinks.length}`);

console.log('PASS: home hero, live hero selector, About/history, gift certificates, visit cards, shared layout, and canonical checks');
