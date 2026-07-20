import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./animals.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(html.includes("fetch('animals.json',{cache:'no-cache'})"), 'missing animals.json fetch');
assert(html.includes("document.getElementById('animal-groups')"), 'animal group container is not referenced in JavaScript');
assert(html.includes("data.groups.forEach(renderGroup)"), 'animal groups are not rendered from the feed');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?img\.alt\s*=\s*group\.species/.test(html), 'rendered animal images are missing non-empty alt text');
assert(html.includes('No animals listed right now — check back soon.'), 'missing empty-state message');
assert(html.includes("We couldn't load the animal roster right now."), 'missing fetch-failure message');

assert(/<section\b[^>]*\baria-labelledby=["']for-sale-title["'][^>]*>/i.test(html), 'missing For Sale section');
assert(html.includes("document.getElementById('for-sale-grid')"), 'For Sale grid container is not referenced in JavaScript');
assert(html.includes('(data.forSale||[]).forEach(renderForSale)'), 'For Sale entries are not rendered from the feed');

assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');
const nav = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
for (const href of ['index.html', 'experiences.html', 'shop.html', 'animals.html', 'meet-the-herd.html', 'rv-rentals.html']) {
  assert(nav.includes(`href="${href}"`), `missing navigation href: ${href}`);
}

const animalsData = JSON.parse(await readFile(new URL('./animals.json', import.meta.url), 'utf8'));
assert(Array.isArray(animalsData.groups) && animalsData.groups.length >= 6, `expected >=6 species groups, found ${(animalsData.groups || []).length}`);
assert(Array.isArray(animalsData.forSale) && animalsData.forSale.length > 0, 'animals.json is missing forSale entries');
for (const group of animalsData.groups) {
  assert(typeof group.species === 'string' && group.species.length > 0, 'a group is missing a species name');
  assert(typeof group.blurb === 'string' && group.blurb.length > 0, `${group.species} is missing a blurb`);
}

console.log('PASS: animals roster, For Sale section, navigation, and feed data checks');
