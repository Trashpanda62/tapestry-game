import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const read = (file) => readFile(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(`[keyboard] ${message}`); };
const home = await read('index.html');
const exp = await read('experiences.html');
const shop = await read('shop.html');
const shopJs = await read('assets/shop.js');
const rv = await read('rv-rentals.html');
const herd = await read('meet-the-herd.html');
const stewardJs = await read('assets/herd-game.js');

const shell = await read('assets/site-shell.js');
assert(/site-nav-toggle/.test(home) && /aria-expanded/.test(home), 'mobile menu lacks expanded state');
// The click handler lives in the shared shell, not inline per page. This assertion
// used to require an inline listener, which is how index.html and rv-rentals.html
// ended up binding a second one: both flipped aria-expanded on the same click, so
// the menu never opened. Check the real wiring, and guard against the re-bind.
// Asset URLs carry a ?v=<content-hash> cache buster in the built output.
assert(/src="assets\/site-shell\.js(?:\?v=[a-f0-9]+)?"/.test(home), 'home page does not load the shared nav shell');
assert(/addEventListener\(["']click["']/.test(shell) && /aria-expanded/.test(shell), 'nav shell lacks a keyboard-activatable click handler');
const shellPages = ['index.html', 'experiences.html', 'shop.html', 'animals.html', 'rv-rentals.html', 'meet-the-herd.html', 'book.html', 'bag.html', 'checkout.html', 'thanks.html', '404.html'];
for (const name of shellPages) {
  const page = await read(name);
  assert(!/site-nav-toggle["']\)[\s\S]{0,200}?addEventListener/.test(page), `${name} re-binds the nav toggle inline; the shared shell already owns it (double-bind leaves the menu permanently closed)`);
}
assert(/skip-to-content/.test(home), 'skip link missing from generated shell');
assert(/experience-filter/.test(exp) && /addEventListener\('change'/.test(exp), 'experience filter lacks native select/change path');
assert(/bookPath/.test(exp) && /Choose a date/.test(exp) && /experience-filter/.test(exp), 'experience booking cards lack a keyboard-addressable first-party path');
assert(/URLSearchParams/.test(shopJs) && /history\.(pushState|replaceState)/.test(shopJs), 'catalog URL state lacks back/forward persistence');
assert(/aria-live/.test(shop) && /No products match/.test(shopJs), 'catalog lacks result announcement/empty state');
assert(/showModal\(\)/.test(rv) && /addEventListener\('close'/.test(rv) && /Return\.focus/.test(rv), 'RV sheets lack close/return focus path');
assert(/id="herd-game"/.test(herd) && /pasture-choice/.test(stewardJs) && /aria-live/.test(herd), 'Herd game lacks keyboard-addressable pasture state');
assert(/prefers-reduced-motion/.test(stewardJs) && /Play another round/.test(stewardJs), 'Herd game reduced-motion/replay path missing');
assert(/prefers-reduced-motion/.test(await read('assets/site.css')) && /reduce/.test(stewardJs), 'reduced-motion override missing');
console.log('[keyboard] PASS: menu, skip link, filters, first-party experience booking paths, catalog state, RV dialogs, Herd game replay, focus, and reduced-motion hooks are wired.');
