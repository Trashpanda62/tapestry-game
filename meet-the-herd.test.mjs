import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./meet-the-herd.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const images = html.match(/<img\b[^>]*>/gi) || [];
assert(images.every((image) => /\balt=["'][^"']+["']/i.test(image)), 'not every image has non-empty alt text');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?im\.alt\s*=\s*p\.n/.test(html), 'rendered portfolio images are missing non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

const nav = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
for (const href of ['index.html', 'experiences.html', 'shop.html', 'rv-rentals.html']) {
  assert(nav.includes(`href="${href}"`), `missing navigation href: ${href}`);
}

const finale = html.match(/<section\b[^>]*\bid=["']finale["'][^>]*>[\s\S]*?<\/section>/i)?.[0] || '';
for (const href of ['experiences.html', 'shop.html', 'rv-rentals.html']) {
  assert(finale.includes(`href="${href}"`), `missing finale href: ${href}`);
}

for (const src of ['assets/herd.js', 'products.js', 'edits.js']) {
  assert(new RegExp(`<script\\b[^>]*\\bsrc=["']${src.replace('.', '\\.')}["'][^>]*>`, 'i').test(html), `missing game script: ${src}`);
}

console.log('PASS: meet-the-herd navigation, finale links, and game scripts');
