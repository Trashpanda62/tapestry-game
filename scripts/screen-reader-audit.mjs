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
assert(/Animals is the reference and for-sale guide/.test(animals) && /Meet the Herd/.test(animals), 'Animals/Herd distinction is not narrated');
assert(/aria-live="polite"/.test(animals) && /aria-busy="true"/.test(animals), 'Animals loading/results announcement missing');
assert(/aria-live="polite"/.test(exp) && /Loading experiences/.test(exp) && /Before you head to the farm/.test(exp), 'Visit loading/guide narrative missing');
assert(/aria-live="polite"/.test(shop) && /role="status"/.test(shop) && /Search products/.test(shop), 'Shop search/results status narrative missing');
assert(/BYO farm-side stay/.test(rv) && /Supplied RV rental/.test(rv) && /role="status"/.test(rv), 'Stay/RV choice and availability status narrative missing');
assert(/id="herd-game"/.test(herd) && /aria-live="polite"/.test(herd) && /herd-game\.js/.test(herd), 'Herd game lacks spoken context');
assert(/Availability calendar/.test(book) && /calendar-experience/.test(book) && /Closed for the season/.test(book) && /reopens March 1 \/ September 1/.test(book) && /route\(['"]checkout/.test(bagScript), 'booking calendar controls or checkout route missing');
assert(/prefers-reduced-motion:reduce/.test(await read('assets/site.css')) && /prefers-reduced-motion:reduce/.test(herd), 'reduced-motion narrative/behavior override missing');
console.log('[screen-reader] PASS: hero, IA distinctions, dynamic status, embedded calendar controls, checkout route, Herd context, and reduced-motion narrative checks passed.');
