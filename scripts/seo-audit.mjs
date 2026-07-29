import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const origin = 'https://sites.obscurastudio.design';
const base = '/s/tapestry-acres';
const routeMap = { 'index.html': '/', 'animals.html': '/animals', 'experiences.html': '/experiences', 'book.html': '/book', 'meet-the-herd.html': '/herd', 'rv-rentals.html': '/stay', 'shop.html': '/shop', 'bag.html': '/bag', 'checkout.html': '/checkout' };
const read = (file) => readFile(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(`[seo] ${message}`); };
const titles = new Set();
for (const [file, route] of Object.entries(routeMap)) {
  const html = await read(file);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
  const canonical = html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i)?.[1];
  assert(title && !titles.has(title), `${file}: missing or duplicate title`); titles.add(title);
  assert(description && description.length >= 80, `${file}: meta description too short`);
  assert(canonical === `${origin}${base}${route === '/' ? '/' : route}`, `${file}: canonical mismatch`);
  assert(/property="og:title"/.test(html) && /property="og:description"/.test(html) && /property="og:image"/.test(html), `${file}: OG metadata incomplete`);
  assert(!/aggregateRating|reviewCount|ratingValue/.test(html), `${file}: invented review schema present`);
  if (file === 'index.html') assert(/LocalBusiness/.test(html) && /PostalAddress/.test(html) && /GeoCoordinates/.test(html), 'Home local-business schema incomplete');
}
const sitemap = await read('sitemap.xml');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expected = Object.values(routeMap).map((route) => `${origin}${base}${route === '/' ? '/' : route}`);
assert(JSON.stringify(sitemapUrls) === JSON.stringify(expected), 'sitemap must contain canonical pages only, excluding 404/thanks/preview');
const robots = await read('robots.txt');
assert(robots.includes(`${origin}${base}/sitemap.xml`), 'robots sitemap URL missing');
const all = await Promise.all(Object.keys(routeMap).map(read));
const localCopy = all.join('\n');
for (const term of ['Monroe', 'Dale Hollow', 'Upper Cumberland']) assert(localCopy.includes(term), `local intent term missing: ${term}`);
console.log(JSON.stringify({ pages: Object.keys(routeMap).length, uniqueTitles: titles.size, sitemapUrls: sitemapUrls.length, schemaInventedReviews: 0, localIntentTerms: 3 }));
console.log('[seo] PASS: canonical/OG/schema/sitemap/robots/local-intent checks passed.');
