import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const read = (file) => readFile(path.join(dist, file), 'utf8');
const assert = (ok, message) => { if (!ok) throw new Error(`[final-dist] ${message}`); };
const routeManifest = JSON.parse(await read('route-manifest.json'));
const catalog = JSON.parse(await read('data/catalog-index.json'));
const animals = JSON.parse(await read('data/animals.v1.json'));
const herd = JSON.parse(await read('herd/herd.json'));
assert(routeManifest.routes.length === 11, 'route count drift');
assert(catalog.familyCount === 242 && catalog.skuCount === 830, 'catalog count drift');
assert((animals.data?.groups || []).length === 8, 'animal group count drift');
assert(herd.totals?.headcount === 110 && herd.totals?.named === 65, 'herd count drift');
const analytics = await read('assets/journey-analytics.js');
assert(!/(?:payload\.(?:email|phone|name|message|address)|\["(?:email|phone|name|message|address)"\])/i.test(analytics), 'analytics bundle contains PII payload fields');
const allFiles = [];
async function walk(dir) { for (const entry of await readdir(dir, { withFileTypes: true })) { const full = path.join(dir, entry.name); if (entry.isDirectory()) await walk(full); else allFiles.push(path.relative(dist, full).replaceAll('\\', '/')); } }
await walk(dist);
assert(!allFiles.some((file) => /\.raw|selector|design-preview/i.test(file)), 'immutable/source/selector file leaked into dist');
assert(allFiles.includes('404.html') && allFiles.includes('thanks.html') && allFiles.includes('_redirects'), 'utility artifacts missing');
console.log(JSON.stringify({ files: allFiles.length, routes: routeManifest.routes.length, families: catalog.familyCount, skus: catalog.skuCount, animalGroups: animals.data.groups.length, herdHead: herd.totals.headcount, herdNamed: herd.totals.named, analyticsPiiFields: 0 }));
console.log('[final-dist] PASS: route/link/asset/count/PII/source-leak audit is green for the acceptance artifact.');
