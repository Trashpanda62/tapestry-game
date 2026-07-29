import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const secret = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}|xox[baprs]-[A-Za-z0-9-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,})/;
const findings = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(?:html|js|css|json|svg|txt|xml|webmanifest)$/i.test(entry.name)) {
      const body = await readFile(file, 'utf8');
      if (secret.test(body)) findings.push(file);
    }
  }
}
await walk(dist);
const credits = await readFile(join(root, 'assets', 'CREDITS.txt'), 'utf8');
const register = await readFile(join(root, 'docs', 'visual-asset-register.md'), 'utf8');
if (!/Generated|Real Tapestry|Existing Tapestry|Local Square/i.test(credits + register)) throw new Error('[secrets] asset rights/credits register is missing provenance notes');
if (findings.length) throw new Error(`[secrets] secret-like patterns found in dist: ${findings.join(', ')}`);
console.log(JSON.stringify({ scanned: 'dist + rights register', secretFindings: 0, rightsNotes: 'present' }));
console.log('[secrets] PASS: no secret patterns in dist; generated/photo rights notes present.');
