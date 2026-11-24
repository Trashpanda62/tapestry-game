import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const html = await readFile(new URL('./farm-meats.html', import.meta.url), 'utf8');
const home = await readFile(new URL('./index.html', import.meta.url), 'utf8');

assert(/<title>[^<]*Farm Meats[^<]*Monroe TN[^<]*<\/title>/i.test(html), 'title must name farm meats and Monroe TN');
assert(/<h1\b[^>]*>[^<]*farm meats/i.test(html), 'h1 must name farm meats');
assert(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']https:\/\/trashpanda62\.github\.io\/tapestry-game\/farm-meats\.html["']/i.test(html), 'canonical must be the farm-meats route');
// Nothing on the page may state facts the farm has not confirmed.
assert(!/\$\s?\d/.test(html), 'no prices until the farm confirms them');
assert(!/\b(beef|pork|lamb|chicken|turkey|goat|sausage|bacon|steak|ribeye|ground|brisket|eggs?)\b/i.test(html), 'no species, cut or product names until the farm confirms them');
assert(!/\b(usda|inspected|certified|organic|grass[- ]fed|pasture[- ]raised|processed|processor|slaughter|butcher|antibiotic|hormone|shipping|ship|deliver)/i.test(html), 'no processing, inspection, diet or delivery claims');
assert(!/"@type"\s*:\s*"Product"/.test(html), 'no Product markup without real product data');
// The request form posts to the Obscura lead inbox like the RV form does.
assert(html.includes('action="https://sites.obscurastudio.design/s/tapestry-acres/__lead"'), 'form must post to the lead endpoint');
for (const name of ['name', 'email', 'phone', 'company', 'message', 'page', 'source']) assert(new RegExp(`name="${name}"`).test(html), `form is missing field ${name}`);
assert(/name="page" value="farm-meats"/.test(html) && /name="source" value="farm-meats-page"/.test(html), 'lead must be attributed to the farm-meats page');
assert(/name="company"[^>]*tabindex="-1"/.test(html), 'honeypot must be hidden from keyboards');
assert(/not an order until we confirm/i.test(html), 'must say a request is not an order');
const nav = html.match(/<nav\b[^>]*id="site-nav"[\s\S]*?<\/nav>/i)?.[0] || '';
assert(/href="freeze-dried\.html"[^>]*>Freeze Dried<\/a><a href="farm-meats\.html" aria-current="page">Farm Meats/i.test(nav), 'nav must put Farm Meats after Freeze Dried and mark it current');
const homeNav = home.match(/<nav\b[^>]*id="site-nav"[\s\S]*?<\/nav>/i)?.[0] || '';
assert(/Freeze Dried<\/a><a href="farm-meats\.html">Farm Meats/i.test(homeNav), 'home nav must list Farm Meats after Freeze Dried');
assert(/class="content-section fm-feature"[\s\S]*href="farm-meats\.html"/.test(home), 'home must have a Farm Meats section');
assert(home.indexOf('fd-feature" aria-labelledby') < home.indexOf('fm-feature" aria-labelledby'), 'home Farm Meats section must sit below freeze dried');
console.log('PASS: farm-meats page content, no invented facts, lead form, nav and home section');
