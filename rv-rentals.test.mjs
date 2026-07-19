import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';

const html = await readFile(new URL('./rv-rentals.html', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(html.includes('action="https://sites.obscurastudio.design/s/tapestry-acres/__lead"'), 'missing lead endpoint form action');
assert(/<iframe\b[^>]*\bname=["']lead_iframe["']/i.test(html), 'missing hidden iframe named lead_iframe');
assert(html.includes('target="lead_iframe"'), 'form does not target lead_iframe');
assert(!/tapestryacres\.com/i.test(html), 'contains a tapestryacres.com reference');
assert(!/wix/i.test(html), 'contains a wix reference');
assert(!html.includes('window.open'), 'contains window.open');
assert(html.includes('name="company"'), 'missing company honeypot input');
assert(html.includes('#booking-sheet[open]'), 'booking sheet geometry is not gated to open');
assert(!html.includes('#booking-sheet{transform:none'), 'reduced motion forces the closed booking sheet on-screen');
assert(!html.includes('#booking-sheet{display:block'), 'mobile CSS forces the closed booking sheet visible');
assert(!html.includes(',#booking-sheet{display:block'), 'mobile CSS forces the closed booking sheet visible');

for (const content of ['$270', '10% off weekly', '50%', '$500', '24 hours']) {
  assert(html.includes(content), `missing required content: ${content}`);
}

for (let photo = 1; photo <= 6; photo += 1) {
  assert(html.includes(`assets/rv-${photo}.jpg`), `missing photo reference: assets/rv-${photo}.jpg`);
}

assert(html.includes("fetch('bookings.json')"), 'missing bookings.json fetch');
assert(html.includes('checkAvailability'), 'missing availability overlap logic');
assert(html.includes('Check availability'), 'missing Check availability control');
assert(html.includes('towels included for on-farm stays'), 'missing corrected towels note');
assert(!html.includes('towels available on request'), 'contains stale towels note');

const bookings = JSON.parse(readFileSync(new URL('./bookings.json', import.meta.url), 'utf8'));
assert(Array.isArray(bookings.bookings), 'bookings.json is missing a bookings array');

for (const stale of ['$220', '$80', '$300', '30 days']) {
  assert(!html.includes(stale), `contains stale/wrong pricing: ${stale}`);
}

for (const id of ['alpaca-walk', 'farm-tour', 'farm-stay', 'photo-session']) {
  assert(html.includes(`href="index.html?add=${id}"`), `missing cross-sell link: ${id}`);
}

assert((html.match(/href=["']http/gi) || []).length === 0, 'contains an external HTTP href');

console.log('PASS: rv-rentals content + link/booking checks');
