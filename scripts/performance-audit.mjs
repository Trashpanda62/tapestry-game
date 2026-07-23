import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const dist = join(root, 'dist');
const routes = [
  ['Home', 'index.html'], ['Experiences', 'experiences.html'], ['Book', 'book.html'], ['Shop', 'shop.html'], ['Bag', 'bag.html'], ['Checkout', 'checkout.html'], ['Herd', 'meet-the-herd.html'],
];
const rows = [];
for (const [name, file] of routes) {
  const html = await readFile(join(dist, file), 'utf8');
  const refs = new Set([file]);
  for (const match of html.matchAll(/(?:src|href)=["']([^"'#?]+)["']/gi)) {
    const ref = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|\/)/i.test(ref)) continue;
    const normalized = ref.replace(/^\.\//, '').replace(/\\/g, '/');
    try { await stat(join(dist, normalized)); refs.add(normalized); } catch { /* external/optional runtime data */ }
  }
  const sizes = await Promise.all([...refs].map(async (ref) => (await stat(join(dist, ref))).size));
  rows.push({ route: name, htmlBytes: Buffer.byteLength(html), requests: refs.size, transferBytes: sizes.reduce((a, b) => a + b, 0), resources: [...refs].sort() });
}
const shop = await readFile(join(dist, 'shop.html'), 'utf8');
const shopJs = await readFile(join(dist, 'assets', 'shop.js'), 'utf8');
const herd = await readFile(join(dist, 'herd', 'index.html'), 'utf8');
const sw = await readFile(join(dist, 'herd', 'sw.js'), 'utf8');
const result = {
  date: '2026-07-21',
  profile: 'deterministic artifact + local HTTP server; 4x CPU/slow-4G browser metric capture unavailable in this app runtime',
  rows,
  interactionBudgets: {
    shopFilter: { algorithm: /matches\.slice\(0,renderedCount\)/.test(shop) || /slice\(0, renderedCount\)/.test(shopJs) ? 'bounded chunk render (24)' : 'unknown', fullCatalogHomeParse: false },
    shopSearchRuntime: { runtimeBytes: Buffer.byteLength(shopJs), gzipBytes: gzipSync(shopJs).byteLength, budgetGzipBytes: 150 * 1024, withinBudget: gzipSync(shopJs).byteLength <= 150 * 1024 },
    herdServiceWorker: { bytes: Buffer.byteLength(sw), versionedCache: /herd-shell-v11-obscura/.test(sw), sameOriginBase: /BASE = '\/s\/tapestry-acres\/herd'/.test(herd) },
  },
  browserMetrics: { LCP: 'N/A — in-app browser page context does not expose PerformanceObserver', CLS: 'N/A — same limitation', INP: 'N/A — same limitation', longTasks: 'N/A — same limitation' },
};
if (!result.interactionBudgets.shopSearchRuntime.withinBudget) throw new Error('[performance] shop search runtime exceeds 150KB gzip budget.');
await import('node:fs/promises').then(({ writeFile }) => writeFile(join(root, 'docs', 'performance-baseline.json'), JSON.stringify(result, null, 2) + '\n'));
console.log(JSON.stringify(result, null, 2));
console.log('[performance] PASS: deterministic bytes/requests and interaction budgets recorded; browser-only metrics explicitly marked unavailable.');
