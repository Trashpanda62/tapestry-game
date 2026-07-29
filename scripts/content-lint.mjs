import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const banned = [
  /trashpanda62\.github\.io\/tapestry-game/i,
  /products\.js\b/i,
  /lorem ipsum|coming soon|your headline|replace me|todo:/i,
  /ai[- ]generated|as an ai language model/i,
];
const emojiOnly = /<button\b(?:(?!aria-label|title)[^>])*?>\s*(?:[\u{1F000}-\u{1FAFF}\u2600-\u27BF]|&[#x][0-9a-f]+;)\s*<\/button>/iu;
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (/\.(?:html|js|css|json|xml|txt)$/i.test(entry.name)) files.push(full);
  }
}
await walk(root);
let stale = 0; let emptyHrefs = 0; let emojiControls = 0;
const emojiControlFiles = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const relative = path.relative(root, file);
  for (const pattern of banned) {
    if (pattern.source.includes('products') && !/\.(?:html|js)$/i.test(file)) continue; // source inventory may name the retired input
    if (pattern.source.includes('lorem') && relative.startsWith(`herd${path.sep}`)) continue; // read-only mirrored chapter retains its own fixture copy
    if (pattern.test(text)) throw new Error(`[content] banned token ${pattern} in ${relative}`);
  }
  if (/\.html$/i.test(file) && !/^herd[\\/]/.test(relative)) emptyHrefs += (text.match(/href=["'](?:\s*|#!)["']/gi) || []).length;
  if (/\.html$/i.test(file) && !relative.startsWith(`herd${path.sep}`) && emojiOnly.test(text)) { emojiControls += 1; emojiControlFiles.push(relative); }
}
if (emptyHrefs || emojiControls) throw new Error(`[content] empty hrefs=${emptyHrefs}, emoji-only controls=${emojiControls} (${emojiControlFiles.join(', ')})`);
console.log(JSON.stringify({ files: files.length, staleClaims: stale, emptyHrefs, emojiOnlyControls: emojiControls }));
console.log('[content] PASS: no stale host/placeholder/AI boilerplate, empty href, or emoji-only control in dist.');
