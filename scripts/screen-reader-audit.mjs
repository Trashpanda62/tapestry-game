import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(`[screen-reader] ${message}`); };
const home = await read('index.html');
const animals = await read('animals.html');
const exp = await read('experiences.html');
const book = await read('book.html');
const shop = await read('shop.html');
const rv = await read('rv-rentals.html');
const herd = await read('meet-the-herd.html');
const shopScript = await read('assets/shop.js');
const bagScript = await read('assets/bag.js');

assert(/host and guest/i.test(home) && /aria-labelledby="hero-title"/.test(home), 'hero does not state host/guest context with heading association');
// The two destinations must be told apart in prose, not just by their nav labels. The
// phrasing is free; what matters is that the reference page says it is the reference
// page and names the Meet the Herd game as the other thing.
assert(/reference and for-sale guide/.test(animals) && /Meet the Herd/.test(animals), 'Animals/Herd distinction is not narrated');
assert(/aria-live="polite"/.test(animals) && /aria-busy="true"/.test(animals), 'Animals loading/results announcement missing');
assert(/aria-live="polite"/.test(exp) && /Loading experiences/.test(exp) && /Before you head to the farm/.test(exp), 'Visit loading/guide narrative missing');
assert(/aria-live="polite"/.test(shop) && /role="status"/.test(shop) && /Search products/.test(shop), 'Shop search/results status narrative missing');
// The three ways to stay are each named in prose, not carried by card colour or icon. The
// old wording ("BYO farm-side stay" / "Supplied RV rental") belonged to a separate choice
// hub now folded into the stay cards — the requirement is unchanged, the names moved.
assert(/Bring Your Own RV/.test(rv) && /On the Farm/.test(rv) && /Delivered to Your Campsite/.test(rv), 'the three stay options are not each named in prose');
assert(/role="status"/.test(rv) && /aria-live="polite"/.test(rv), 'Stay/RV availability status narrative missing');
// The class filter is a radiogroup, so it is announced as one control with a checked
// option rather than three unrelated buttons.
assert(/role="radiogroup"/.test(rv) && /aria-label="Which kind of RV\?"/.test(rv), 'the RV class filter is not announced as a labelled radiogroup');
assert(/id="herd-game"/.test(herd) && /aria-live="polite"/.test(herd) && /herd-game(?:\.[a-f0-9]{12})?\.js/.test(herd), 'Herd game lacks spoken context');
assert(/Availability calendar/.test(book) && /calendar-experience/.test(book) && /Closed for the season/.test(book) && /reopens March 1 \/ September 1/.test(book) && /route\(['"]checkout/.test(bagScript), 'booking calendar controls or checkout route missing');
// The time chips show only the clock time, because the calendar and the status line
// above them both already name the day. Non-visual users get the full date from the
// radio's own label instead, so that label is load-bearing rather than decorative.
assert(/input\.setAttribute\('aria-label',\s*start\.toLocaleString/.test(book), 'time slots no longer announce their full date');
// A descendant selector here inflated every slot radio to width:100%, which is what
// broke the slot rows into a right-aligned wrap. Keep it scoped to direct children.
assert(/\.field>input,\.field>select\{/.test(book) && !/\.field input,\.field select\{/.test(book), 'the field width rule is unscoped again and will inflate the slot radios');
assert(!/' place'\s*\+\s*\(/.test(book), 'slot pluralisation is back to rendering "2 place places"');
assert(/prefers-reduced-motion:reduce/.test(await read('assets/site.css')) && /prefers-reduced-motion:reduce/.test(herd), 'reduced-motion narrative/behavior override missing');
console.log('[screen-reader] PASS: hero, IA distinctions, dynamic status, embedded calendar controls, checkout route, Herd context, and reduced-motion narrative checks passed.');
