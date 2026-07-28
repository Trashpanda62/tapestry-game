import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./meet-the-herd.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const images = html.match(/<img\b[^>]*>/gi) || [];
assert(images.length > 0, 'game page needs a real herd image');
assert(images.every((image) => /\balt=["'][^"']+["']/i.test(image)), 'not every image has non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

const nav = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
for (const href of ['index.html', 'experiences.html', 'shop.html', 'animals.html', 'rv-rentals.html']) {
  assert(nav.includes(`href="${href}"`), `missing navigation href: ${href}`);
}
assert(html.includes('assets/herd-game.js'), 'missing playable game runtime');
assert(html.includes('experiences#availability'), 'missing availability path from game');
assert(!html.includes('assets/herd.js'), 'legacy embedded homepage runtime is still referenced');
assert(!html.includes('edits.js'), 'legacy visual editor runtime is still referenced');

console.log('PASS: Meet the Herd game page has accessible navigation, imagery, focused game runtime, and visit path');
