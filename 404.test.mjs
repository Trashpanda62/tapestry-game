import { access, readFile } from 'node:fs/promises';

const url = new URL('./404.html', import.meta.url);
await access(url);
const html = await readFile(url, 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

assert(/<a\b[^>]*\bhref=["']index\.html["'][^>]*>/i.test(html), '404 page does not link back to index.html');
assert(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']assets\/site\.css["'])[^>]*>/i.test(html), '404 page does not use site.css');

console.log('PASS: 404 page exists, links home, and uses the site stylesheet');
