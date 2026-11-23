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
// Decorative images must declare it twice: alt="" AND aria-hidden. Only the header logo
// mark qualifies, because the wordmark beside it already announces the brand.
const decorative = (image) => /\balt=["']["']/i.test(image) && /\baria-hidden=["']true["']/i.test(image);
assert(images.every((image) => /\balt=["'][^"']+["']/i.test(image) || decorative(image)),
  'not every image has non-empty alt text (or a decorative alt="" + aria-hidden pair)');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

const nav = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
for (const href of ['shop.html', 'freeze-dried.html', 'animals.html', 'experiences.html', 'index.html#our-story']) {
  assert(nav.includes(`href="${href}"`), `missing navigation href: ${href}`);
}
assert(html.includes('assets/herd-game.js'), 'missing playable game runtime');
// Was `experiences#availability`, which pinned a broken link: experiences.html has no
// element with id="availability", so the anchor landed at the top of the wrong page.
// The real "check availability" surface is the booking page.
assert(html.includes('href="book.html"'), 'missing availability path from game');
assert(!html.includes('experiences#availability'), 'stale availability anchor points at an id that does not exist');
assert(!html.includes('assets/herd.js'), 'legacy embedded homepage runtime is still referenced');
assert(!html.includes('edits.js'), 'legacy visual editor runtime is still referenced');

console.log('PASS: Meet the Herd game page has accessible navigation, imagery, focused game runtime, and visit path');
