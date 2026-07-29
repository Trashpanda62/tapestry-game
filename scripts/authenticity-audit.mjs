import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const routes = ['index.html', 'experiences.html', 'shop.html', 'animals.html', 'rv-rentals.html', 'meet-the-herd.html'];
const read = (file) => readFile(path.join(root, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(`[authenticity] ${message}`); };
const pages = await Promise.all(routes.map(read));
const visible = pages.map((html) => html.replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '')).join('\n');
const css = await read('assets/site.css');
assert(!/font-family\s*:[^;]*(?:cursive|handwriting|comic)/i.test(visible), 'fake handwritten font treatment found');
assert(!/lorem ipsum|coming soon|your headline|click here/i.test(visible), 'placeholder/AI boilerplate found');
for (const proof of ['110 acres', 'Monroe', 'working farm', 'Square']) assert(new RegExp(proof, 'i').test(visible), `farm evidence missing: ${proof}`);
// The named-animal claim has to be carried by actual names. This used to test for the
// literal string "named-animal", which was only satisfied by a "Named-animal proof"
// section kicker — internal acceptance-criteria vocabulary printed at a visitor.
assert(/\bAgnis\b|\bAvalanche\b|\bBianca\b/.test(visible), 'farm evidence missing: real animal names');
assert(/editorial-sequence/.test(visible) && /stay-cards/.test(visible) && /cross-sell-grid/.test(visible), 'layout lacks varied editorial/card rhythm');
assert(/--shadow:/.test(css) && /rgba\(15,12,7,\.\d+\)/.test(css), 'shared restrained shadow token missing');
const emDashCount = (visible.match(/—/g) || []).length;
assert(emDashCount <= 25, `em-dash rhythm exceeds review threshold (${emDashCount})`);
console.log(JSON.stringify({ routes: routes.length, emDashCount, bannedTells: 0, evidenceTerms: 5 }));
console.log('[authenticity] PASS: evidence-led copy/layout has no fake handwritten/placeholder tells; retained farm-label punctuation is bounded and documented.');
