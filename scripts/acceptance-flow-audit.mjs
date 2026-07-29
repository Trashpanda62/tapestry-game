import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = JSON.parse(await readFile(path.join(root, 'docs', 'acceptance-flow-evidence.json'), 'utf8'));
const byPath = Object.fromEntries(evidence.flows.map((flow) => [flow.path, flow]));
const assert = (ok, message) => { if (!ok) throw new Error(`[flow] ${message}`); };
assert(/family, walk/.test(byPath['index.html'].h1) && byPath['index.html'].links.some((href) => href.endsWith('/experiences')), 'Home booking CTA missing');
assert(byPath['experiences.html'].experiences === 7 && byPath['experiences.html'].hasInquiry && byPath['experiences.html'].hasForm, 'Experiences inquiry branch missing');
assert(byPath['shop.html'].products === 24 && byPath['shop.html'].hasSquare, 'Shop bounded/Square branch missing');
assert(byPath['animals.html'].animals === 8, 'Animals group rendering missing');
assert(byPath['rv-rentals.html'].hasStayChoice && byPath['rv-rentals.html'].hasInquiry && byPath['rv-rentals.html'].hasForm, 'Stay/RV distinction/form missing');
assert(byPath['meet-the-herd.html'].hasHerdFrame && byPath['meet-the-herd.html'].hasQuiz, 'Herd browser/quiz entry missing');
assert(byPath['404.html'].h1 && byPath['thanks.html'].h1, 'utility route smoke missing');
assert(evidence.notes.some((note) => /no forms submitted/i.test(note)), 'flow run must remain read-only');
console.log('[flow] PASS: read-only Home/Visit/Stay/Animals/Herd/Shop/404/thanks flow evidence is complete.');
