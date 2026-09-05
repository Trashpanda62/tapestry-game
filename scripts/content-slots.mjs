// Site Manager editing slots for the Tapestry bundle.
//
//   node scripts/content-slots.mjs --emit   print the registry JSON the app
//                                           embeds (id, page, kind, text / alt)
//   node scripts/content-slots.mjs --tag    stamp data-slot / data-photo /
//                                           data-fact attributes into the page
//                                           sources (idempotent)
//   node scripts/content-slots.mjs --check  exit 1 if any slot does not match
//                                           exactly one element in dist/
//
// The registry in the app (C:\dev\webstudio-host\src\lib\tapestry\*.ts) must
// carry the same ids and default text; the app's public api/site/content
// endpoint serves overrides and assets/site-content.js applies them by id.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(readFileSync(resolve(root, 'src/content-slots.json'), 'utf8'));
const mode = process.argv[2] || '--check';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026', rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201d', ldquo: '\u201c', middot: '\u00b7' };
function unescapeHtml(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(parseInt(e[1] === 'x' || e[1] === 'X' ? e.slice(2) : e.slice(1), e[1] === 'x' || e[1] === 'X' ? 16 : 10));
    return e in ENTITIES ? ENTITIES[e] : m;
  });
}
function textOf(innerHtml) {
  return unescapeHtml(innerHtml.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

/** The sources without our own attributes, so `find` strings written against
 * the untagged markup keep matching after a --tag pass (which is therefore
 * idempotent: strip, locate, re-stamp). */
function pristine(html) {
  return html.replace(/ data-(?:slot|photo|fact)="[^"]*"/g, '');
}

/** Locate the element for a slot: the first `<tag` at or after `find`. Returns
 * { open, close, tagEnd, innerStart, innerEnd } offsets, or null. */
function locate(html, slot) {
  const at = html.indexOf(slot.find);
  if (at === -1) return null;
  if (html.indexOf(slot.find, at + 1) !== -1) return { error: 'find string is not unique' };
  const re = new RegExp(`<${slot.tag}(?=[\\s>])`, 'g');
  re.lastIndex = at;
  const m = re.exec(html);
  if (!m) return null;
  const open = m.index;
  const tagEnd = html.indexOf('>', open);
  const closeTag = `</${slot.tag}>`;
  const close = html.indexOf(closeTag, tagEnd);
  if (tagEnd === -1 || close === -1) return null;
  return { open, tagEnd, innerStart: tagEnd + 1, innerEnd: close };
}

function locateImg(html, slot) {
  const at = html.indexOf(slot.find);
  if (at === -1) return null;
  if (html.indexOf(slot.find, at + 1) !== -1) return { error: 'find string is not unique' };
  const tagEnd = html.indexOf('>', at);
  return { open: at, tagEnd };
}

function attr(openTag, name) {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(openTag);
  return m ? unescapeHtml(m[1]) : '';
}

function pageFiles() {
  return readdirSync(root).filter((f) => f.endsWith('.html') && !/^(design-preview|surface-preview|rv-admin)\.html$/.test(f));
}

function emit() {
  const copy = [];
  for (const s of spec.copy) {
    const html = pristine(readFileSync(resolve(root, s.file), 'utf8'));
    const loc = locate(html, s);
    if (!loc || loc.error) throw new Error(`${s.id}: ${loc?.error || 'not found'} in ${s.file}`);
    copy.push({ id: s.id, page: s.page, kind: s.kind, text: textOf(html.slice(loc.innerStart, loc.innerEnd)) });
  }
  const photos = [];
  for (const s of spec.photos) {
    const html = pristine(readFileSync(resolve(root, s.file), 'utf8'));
    const loc = locateImg(html, s);
    if (!loc || loc.error) throw new Error(`${s.id}: ${loc?.error || 'not found'} in ${s.file}`);
    const openTag = html.slice(loc.open, loc.tagEnd + 1);
    photos.push({ id: s.id, page: s.page, label: s.label, src: attr(openTag, 'src'), alt: attr(openTag, 'alt') });
  }
  return { copy, photos };
}

function tagSources() {
  // Per file: strip our attributes, locate every slot in that pristine text,
  // then insert from the highest offset down so earlier offsets stay valid.
  const plan = new Map(); // file -> [{ at, attr }]
  const add = (f, at, attr) => { if (!plan.has(f)) plan.set(f, []); plan.get(f).push({ at, attr }); };
  const sources = new Map();
  const load = (f) => (sources.has(f) ? sources.get(f) : (sources.set(f, pristine(readFileSync(resolve(root, f), 'utf8'))), sources.get(f)));
  for (const s of spec.copy) {
    const loc = locate(load(s.file), s);
    if (!loc || loc.error) throw new Error(`${s.id}: ${loc?.error || 'not found'} in ${s.file}`);
    add(s.file, loc.open + 1 + s.tag.length, ` data-slot="${s.id}"`);
  }
  for (const s of spec.photos) {
    const loc = locateImg(load(s.file), s);
    if (!loc || loc.error) throw new Error(`${s.id}: ${loc?.error || 'not found'} in ${s.file}`);
    add(s.file, loc.open + 4, ` data-photo="${s.id}"`);
  }
  for (const s of spec.facts) {
    for (const f of s.file === '*' ? pageFiles() : [s.file]) {
      const html = load(f);
      let from = 0;
      for (;;) {
        const at = html.indexOf(s.find, from);
        if (at === -1) break;
        add(f, at + 1 + s.tag.length, ` data-fact="${s.fact}"`);
        from = at + s.find.length;
      }
    }
  }
  for (const [f, inserts] of plan) {
    let html = sources.get(f);
    inserts.sort((a, b) => b.at - a.at);
    for (const { at, attr } of inserts) html = html.slice(0, at) + attr + html.slice(at);
    writeFileSync(resolve(root, f), html);
  }
  return [...plan.keys()];
}

function check() {
  const registry = emit();
  const problems = [];
  const dist = resolve(root, 'dist');
  const count = (html, re) => (html.match(re) || []).length;
  for (const s of registry.copy) {
    const src = spec.copy.find((x) => x.id === s.id);
    const file = resolve(dist, src.file);
    if (!existsSync(file)) { problems.push(`${s.id}: dist/${src.file} missing`); continue; }
    const html = readFileSync(file, 'utf8');
    const n = count(html, new RegExp(`data-slot="${s.id.replace(/\./g, '\\.')}"`, 'g'));
    if (n !== 1) problems.push(`${s.id}: expected one data-slot in dist/${src.file}, found ${n}`);
  }
  for (const s of registry.photos) {
    const src = spec.photos.find((x) => x.id === s.id);
    const html = readFileSync(resolve(dist, src.file), 'utf8');
    const n = count(html, new RegExp(`data-photo="${s.id.replace(/\./g, '\\.')}"`, 'g'));
    if (n !== 1) problems.push(`${s.id}: expected one data-photo in dist/${src.file}, found ${n}`);
  }
  for (const f of pageFiles()) {
    const html = readFileSync(resolve(dist, f), 'utf8');
    // The build content-hashes asset filenames (site-content.<hash>.js).
    if (!/assets\/site-content(\.[0-9a-f]+)?\.js/.test(html)) problems.push(`dist/${f}: site-content.js not injected`);
  }
  return problems;
}

if (mode === '--emit') {
  process.stdout.write(JSON.stringify(emit(), null, 2) + '\n');
} else if (mode === '--tag') {
  console.log('tagged: ' + tagSources().join(', '));
} else {
  const problems = check();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log('content slots: ok');
}
