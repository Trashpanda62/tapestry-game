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
// An image may be silent ONLY if it declares that twice: alt="" AND aria-hidden. The
// header logo mark sits directly beside the wordmark it duplicates, so announcing it
// would read the brand name twice. Everything else needs real alt text.
const decorative = (image) => /\balt=["']["']/i.test(image) && /\baria-hidden=["']true["']/i.test(image);
assert(images.every((image) => /\balt=["'][^"']+["']/i.test(image) || decorative(image)),
  'not every image has non-empty alt text (or a decorative alt="" + aria-hidden pair)');
// The script-built class-tile images. The `|| fallback` matters as much as the
// authored alt: a class added to CLASSES without an `alt` key must still ship a
// described image rather than an empty one. (Was pinned to `unit.alt` when the
// fleet rendered six per-unit cards; the tiles are per class now.)
assert(/document\.createElement\(['"]img['"]\)[\s\S]*?img\.alt\s*=\s*cls\.alt\s*\|\|\s*\(?\s*[^;]*["'][^"']+["']/.test(html), 'rendered class-tile images are missing non-empty alt text');
assert(!/\ba (?=[AEIOU])/.test(html.replace(/<!--[\s\S]*?-->/g, '')), 'copy contains "a" before a vowel sound (e.g. "a Entegra")');
assert(/<button\b(?=[^>]*\bclass=["'][^"']*\bsite-nav-toggle\b)(?=[^>]*\baria-label=["'][^"']+["'])[^>]*>/i.test(html), 'mobile navigation toggle is missing an aria-label');

assert(/<head>[\s\S]*<link rel="stylesheet" href="assets\/site\.css">[\s\S]*<\/head>/i.test(html), 'missing site stylesheet link in head');

const nav = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/i)?.[0] || '';
for (const href of ['index.html', 'experiences.html', 'shop.html', 'animals.html', 'meet-the-herd.html', 'rv-rentals.html']) {
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
  assert(html.includes(`assets/rv-${photo}.webp`), `missing photo reference: assets/rv-${photo}.webp`);
}

for (const photo of ['odyssey.png', 'sequence.png']) {
  assert(html.includes(`assets/fleet/${photo}`), `missing fleet photo reference: assets/fleet/${photo}`);
}

assert(html.includes("fetch('bookings.json'"), 'missing bookings.json fetch');
assert(html.includes('checkAvailability'), 'missing availability overlap logic');
// The old "Check availability" button is gone: the month grid shows open, limited and
// booked nights on sight, so there is nothing left to submit. Assert the calendar
// surface and its date logic instead of the control it replaced.
assert(html.includes('assets/rv-availability.js'), 'missing shared availability date logic');
assert(/<div\b[^>]*\bid=["']calendar-grid["'][^>]*\brole=["']grid["']/i.test(html), 'missing availability calendar grid');
// Class-scoped, not unit-scoped: the calendar opens on the first night ANY rig of the
// chosen class is free, and re-derives it when the class changes.
assert(html.includes('RV.nextOpenNight('), 'the calendar does not jump to the class\'s next open night');
assert(/nextOpenNight\(bookingIndex,activeClass\.units,todayDay/.test(html), 'the calendar does not default to the next available night on load');
assert(html.includes('RV.isNightBooked('), 'calendar days are not shaded by per-night availability');
// Exactly three availability states, computed by count and not by a ratio.
assert(/openUnits===0\?'none':\(openUnits===scope\.length\?'all':'some'\)/.test(html), 'calendar day states are not an exact all/some/none split');
assert(html.includes("tally.textContent=openUnits+'/'+scope.length"), 'partly-open days do not print how many are left');
assert(html.includes('bookingIndex.updated'), 'availability freshness date is not surfaced to guests');
assert(html.includes('towels included for on-farm stays'), 'missing corrected towels note');
assert(!html.includes('towels available on request'), 'contains stale towels note');
assert(/<dialog\b[^>]*\bid=["']rv-detail["']/i.test(html), 'missing RV detail dialog');
assert(html.includes('function openDetail'), 'missing openDetail function');
assert(html.includes("'#rv/'"), 'missing RV detail hash route');
// The class tiles are a radiogroup: exactly one is always chosen, which is what radio
// semantics describe and what a row of independent buttons does not.
assert(/<div\b[^>]*\bid=["']class-tabs["'][^>]*\brole=["']radiogroup["']/i.test(html), 'class tiles are not wrapped in a radiogroup');
assert(html.includes("tab.setAttribute('role','radio')"), 'class tiles are missing radio roles');
assert(html.includes("tab.addEventListener('keydown'"), 'class tiles are missing arrow-key navigation');
// Roving tabindex that still leaves exactly one tab stop when NO class is chosen —
// the arrival state, since the calendar now opens unfiltered across the whole fleet.
assert(/tab\.tabIndex=on\?0:\(!anyChecked&&index===0\?0:-1\)/.test(html), 'class tiles are missing a roving tabindex');
assert(html.includes("var activeClass=ANY_CLASS"), 'the calendar does not open unfiltered across the whole fleet');
assert(/selectClass\(activeClass\.key===cls\.key\?ANY_CLASS:cls,true\)/.test(html), 'clicking the chosen class does not clear the filter');
assert(!html.includes('availability-unit'), 'the replaced "Which RV?" select is still present');
// Every rig keeps a reachable detail page, so collapsing six cards into three tiles
// does not bury four written spec sheets.
for (const id of ['max-1', 'max-2', 'max-3', 'max-4', 'max-5', 'max-6']) {
  assert(html.includes(`'${id}'`), `class model no longer references ${id}`);
}

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

// These four used to assert `href="index.html?add=<slug>"`, which pinned the test
// to a bug: nothing on the site ever read an `add` query parameter, so all four
// cross-sell buttons dropped the guest on the home page with nothing selected.
// The test passed the whole time because it only checked the string was present.
// Now it asserts the working target and forbids the dead one coming back.
for (const key of ['alpaca-experience-walk', 'private-guided-farm-tour', 'coffee-with-the-cows']) {
  assert(html.includes(`href="book.html?experience=${key}"`), `missing cross-sell link: ${key}`);
}
assert(!/href="[^"]*[?&]add=/.test(html), 'a cross-sell link still uses the dead ?add= parameter');

assert((html.match(/<a\b[^>]*href=["']http/gi) || []).length === 0, 'contains an external HTTP link');

console.log('PASS: rv-rentals content + link/booking checks');
