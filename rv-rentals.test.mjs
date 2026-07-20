import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const html = await readFile(new URL('./rv-rentals.html', import.meta.url), 'utf8');
const css = await readFile(new URL('./assets/site.css', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const images = html.match(/<img\b[^>]*>/gi) || [];
assert(images.every((image) => /\balt=["'][^"']+["']/i.test(image)), 'not every image has non-empty alt text');
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?img\.alt\s*=\s*unit\.alt\s*\|\|\s*["'][^"']+["']/.test(html), 'rendered fleet images are missing non-empty alt text');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

assert(/<head>[\s\S]*<link rel="stylesheet" href="assets\/site\.css">[\s\S]*<\/head>/i.test(html), 'missing site stylesheet link in head');

const nav = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
for (const href of ['index.html', 'experiences.html', 'shop.html', 'meet-the-herd.html', 'rv-rentals.html']) {
  assert(nav.includes(`href="${href}"`), `missing navigation href: ${href}`);
}

assert(html.includes('action="https://sites.obscurastudio.design/s/tapestry-acres/__lead"'), 'missing lead endpoint form action');
assert(/<iframe\b[^>]*\bname=["']lead_iframe["']/i.test(html), 'missing hidden iframe named lead_iframe');
assert(html.includes('target="lead_iframe"'), 'form does not target lead_iframe');
assert(html.includes('setTimeout(function(){form.hidden=true;confirmation.hidden=false;confirmation.focus();},50);'), 'booking form submit confirmation behavior changed');
assert(!/tapestryacres\.com/i.test(html), 'contains a tapestryacres.com reference');
assert(!/wix/i.test(html), 'contains a wix reference');
assert(!html.includes('window.open'), 'contains window.open');
assert(html.includes('name="company"'), 'missing company honeypot input');
assert(css.includes('#booking-sheet[open]'), 'booking sheet geometry is not gated to open');
assert(!css.includes('#booking-sheet{transform:none'), 'reduced motion forces the closed booking sheet on-screen');
assert(!css.includes('#booking-sheet{display:block'), 'mobile CSS forces the closed booking sheet visible');
assert(!css.includes(',#booking-sheet{display:block'), 'mobile CSS forces the closed booking sheet visible');

for (const content of ['$270', '10% off weekly', '50%', '$500', '24 hours']) {
  assert(html.includes(content), `missing required content: ${content}`);
}

for (let photo = 1; photo <= 6; photo += 1) {
  assert(html.includes(`assets/rv-${photo}.jpg`), `missing photo reference: assets/rv-${photo}.jpg`);
}

for (const photo of ['odyssey.png', 'sequence.png']) {
  assert(html.includes(`assets/fleet/${photo}`), `missing fleet photo reference: assets/fleet/${photo}`);
}

assert(html.includes("fetch('bookings.json')"), 'missing bookings.json fetch');
assert(html.includes('checkAvailability'), 'missing availability overlap logic');
assert(html.includes('Check availability'), 'missing Check availability control');
assert(html.includes('towels included for on-farm stays'), 'missing corrected towels note');
assert(!html.includes('towels available on request'), 'contains stale towels note');
assert(/<dialog\b[^>]*\bid=["']rv-detail["']/i.test(html), 'missing RV detail dialog');
assert(html.includes('function openDetail'), 'missing openDetail function');
assert(html.includes("'#rv/'"), 'missing RV detail hash route');
assert(html.includes("card.setAttribute('role','button')"), 'fleet cards are missing button roles');
assert(html.includes("card.addEventListener('keydown'"), 'fleet cards are missing keyboard activation');

for (const overview of [
  'Our roomiest Class C.',
  'Step-up Class A comfort.',
  'The family favorite.',
  'Our nimble camper van — the easy one.'
]) {
  assert(html.includes(overview), `missing fleet overview: ${overview}`);
}

assert(html.includes("var farmFieldNow='Alpacas'"), 'missing editable farm field variable');
for (const campground of ['Willow Grove', 'Old Mill Camp', 'Standing Stone', 'Salt Lick Creek', 'Defeated Creek', 'Dale Hollow Damsite']) {
  assert(html.includes(campground), `missing campground: ${campground}`);
}

const bookings = JSON.parse(readFileSync(new URL('./bookings.json', import.meta.url), 'utf8'));
assert(Array.isArray(bookings.bookings), 'bookings.json is missing a bookings array');

for (const stale of ['$220', '$80', '$300', '30 days']) {
  assert(!html.includes(stale), `contains stale/wrong pricing: ${stale}`);
}

for (const id of ['alpaca-walk', 'farm-tour', 'farm-stay', 'photo-session']) {
  assert(html.includes(`href="index.html?add=${id}"`), `missing cross-sell link: ${id}`);
}

assert((html.match(/<a\b[^>]*href=["']http/gi) || []).length === 0, 'contains an external HTTP link');

console.log('PASS: rv-rentals content + link/booking checks');
