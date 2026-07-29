import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist', import.meta.url));
const routes = ['index.html', 'experiences.html', 'book.html', 'shop.html', 'bag.html', 'checkout.html', 'animals.html', 'rv-rentals.html', 'meet-the-herd.html', '404.html', 'thanks.html'];
const fail = (file, message) => { throw new Error(`[a11y] ${file}: ${message}`); };

function luminance(hex) {
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
  const linear = rgb.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function ratio(foreground, background) {
  const a = luminance(foreground); const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const file of routes) {
  const html = await readFile(path.join(root, file), 'utf8');
  const h1 = html.match(/<h1\b/gi) || [];
  if (h1.length !== 1) fail(file, `expected one H1, found ${h1.length}`);
  if (!/<main\b/i.test(html) || !/<nav\b/i.test(html) || !/skip-link/i.test(html)) fail(file, 'missing main/nav/skip-link landmarks');
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) if (!/\balt=["'][^"']+["']/i.test(tag)) fail(file, 'image is missing a non-empty alt attribute');
  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    const attrs = match[1];
    const text = `${match[2].replace(/<[^>]+>/g, '')} ${(match[2].match(/\balt=["']([^"']+)["']/i)?.[1] || '')}`.replace(/&(?:amp|lt|gt|quot|#\d+);/g, '').trim();
    if (!/(?:aria-label|aria-labelledby|title)=["'][^"']+["']/i.test(attrs) && !text) fail(file, 'button lacks an accessible name');
  }
  for (const tag of html.match(/<(?:input|textarea|select)\b[^>]*>/gi) || []) {
    if (/\btype=["'](?:hidden|radio|checkbox)["']/i.test(tag) || /\baria-hidden=["']true["']/i.test(tag)) continue;
    if (!/(?:aria-label|aria-labelledby)=["'][^"']+["']/i.test(tag) && !/\bid=["'][^"']+["']/i.test(tag)) fail(file, 'form control lacks an id or ARIA label');
  }
  for (const tag of html.match(/<a\b[^>]*>/gi) || []) {
    const href = tag.match(/\bhref=["']([^"']*)["']/i)?.[1];
    if (!href || href === '#' || /^javascript:/i.test(href)) fail(file, 'empty or script link');
    if (/target=["']_blank["']/i.test(tag) && !/\brel=["'][^"']*noopener/i.test(tag)) fail(file, 'new-tab link lacks rel=noopener');
  }
  if (/tabindex=["']([1-9]\d*)["']/i.test(html)) fail(file, 'positive tabindex found');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) fail(file, `duplicate id: ${duplicate}`);
}

const css = await readFile(path.join(root, 'assets/site.css'), 'utf8');
if (!/:where\([^}]*focus-visible/.test(css) || !/prefers-reduced-motion/.test(css)) throw new Error('[a11y] shared focus-visible/reduced-motion styles missing');
const contrastChecks = [
  ['ink on cream', '#33301f', '#f7f4ec', 4.5],
  ['forest on cream', '#4b6b3c', '#f7f4ec', 4.5],
  ['accent on white', '#c0492f', '#ffffff', 4.5],
  ['muted on cream', '#6f6a55', '#f7f4ec', 4.5],
];
for (const [name, fg, bg, threshold] of contrastChecks) {
  const actual = ratio(fg, bg);
  if (actual < threshold) throw new Error(`[a11y] contrast ${name} ${actual.toFixed(2)} < ${threshold}`);
}
console.log(JSON.stringify({ routes: routes.length, checks: ['landmarks', 'alt', 'controls', 'links', 'focus', 'reduced-motion', 'contrast'], contrast: Object.fromEntries(contrastChecks.map(([name, fg, bg]) => [name, Number(ratio(fg, bg).toFixed(2))])) }));
console.log('[a11y] PASS: semantic, keyboard, naming, link-safety, focus, reduced-motion, and locked-palette contrast checks passed.');
