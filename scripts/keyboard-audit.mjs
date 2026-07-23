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

assert(/site-nav-toggle/.test(home) && /aria-expanded/.test(home), 'mobile menu lacks expanded state');
assert(/site-nav-toggle/.test(home) && /addEventListener\('click'/.test(home), 'mobile menu lacks keyboard-activatable click handler');
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
