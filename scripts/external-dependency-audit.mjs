import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const runtimeExt = /\.(?:html|js|css|json)$/i;
const urls = new Map();

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (runtimeExt.test(entry.name)) {
      const body = (await readFile(file, 'utf8'))
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1');
      for (const match of body.matchAll(/https?:\/\/[^\s"'<>`)]+/g)) {
        const value = match[0].replace(/[.,;]+$/, '');
        if (!urls.has(value)) urls.set(value, relative(root, file).replaceAll('\\', '/'));
      }
    }
  }
}

const allowed = [
  ['first-party', (url) => ['sites.obscurastudio.design', 'tapestry-sandbox.obscurastudio.design'].includes(url.hostname)],
  ['Square Web Payments SDK', (url) => ['web.squarecdn.com', 'sandbox.web.squarecdn.com'].includes(url.hostname)],
  ['approved map', (url) => url.hostname === 'maps.google.com'],
  ['approved map', (url) => url.hostname === 'www.google.com' && url.pathname.startsWith('/maps/')],
  ['metadata vocabulary', (url) => url.hostname === 'schema.org' || url.hostname === 'www.w3.org'],
  // Photo/source links may appear in an authored credit block; they are
  // classified explicitly rather than silently treated as first-party.
  ['approved photo', (url) => ['images.unsplash.com', 'unsplash.com', 'drive.google.com', 'script.google.com', 'items-images-production.s3.us-west-2.amazonaws.com'].includes(url.hostname)],
];

await walk(root);
const classified = [];
const unexpected = [];
for (const [value, file] of urls) {
  let parsed;
  try { parsed = new URL(value); } catch { unexpected.push({ value, file, reason: 'invalid URL' }); continue; }
  const rule = allowed.find(([, test]) => test(parsed));
  if (!rule) unexpected.push({ value, file, reason: 'unapproved runtime dependency' });
  else classified.push({ value, file, class: rule[0] });
}
if (unexpected.length) {
  console.error(JSON.stringify({ unexpected }, null, 2));
  throw new Error(`[external] ${unexpected.length} unexpected runtime external dependencies`);
}
const counts = Object.fromEntries([...new Set(classified.map((entry) => entry.class))].map((name) => [name, classified.filter((entry) => entry.class === name).length]));
console.log(JSON.stringify({ runtimeUrls: classified.length, counts, examples: classified.slice(0, 12) }, null, 2));
console.log('[external] PASS: zero unexpected external runtime dependencies.');
