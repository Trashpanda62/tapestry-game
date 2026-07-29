// Serves C:\dev\tapestry-game\dist under /s/tapestry-acres/ so the built <base href>
// resolves exactly as it does in production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

const ROOT = 'C:/dev/tapestry-game/dist';
const PREFIX = '/s/tapestry-acres';
const PORT = Number(process.env.PORT || 8791);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain',
};

// Read-only passthrough for the booking APIs, which only exist on the deployed
// origin. GET only, on purpose: /api/booking/hold and /api/booking/pay are POSTs
// that would create real reservations and take real payments.
const UPSTREAM = 'https://sites.obscurastudio.design';

createServer(async (req, res) => {
  const raw = req.url || '/';
  let url = decodeURIComponent(raw.split('?')[0]);
  if (url.startsWith(`${PREFIX}/api/`)) {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'content-type': 'application/json' });
      return res.end('{"error":"local preview proxies GET only; use the deployed site for holds and payments"}');
    }
    try {
      const upstream = await fetch(UPSTREAM + raw, { headers: { accept: 'application/json' } });
      const body = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' });
      return res.end(body);
    } catch (error) {
      res.writeHead(502, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ error: String(error) }));
    }
  }
  if (url === PREFIX) { res.writeHead(302, { Location: PREFIX + '/' }); return res.end(); }
  if (!url.startsWith(PREFIX + '/')) { res.writeHead(404); return res.end('outside base path'); }
  let rel = url.slice(PREFIX.length + 1) || 'index.html';
  // Deep routes like /book/<experience-key> are served by the nearest parent's
  // index.html on the deployed site, so walk up rather than dropping to the root.
  const parents = [];
  const segments = rel.split('/').filter(Boolean);
  for (let depth = segments.length - 1; depth > 0; depth--) parents.push(`${segments.slice(0, depth).join('/')}/index.html`);
  const candidates = [rel, `${rel}/index.html`, `${rel}.html`, ...parents, 'index.html'];
  for (const candidate of candidates) {
    const file = normalize(join(ROOT, candidate));
    if (!file.replace(/\\/g, '/').startsWith(ROOT)) continue;
    try {
      const info = await stat(file);
      if (!info.isFile()) continue;
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      return res.end(body);
    } catch { /* try the next candidate */ }
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found');
}).listen(PORT, () => console.log(`serving ${ROOT} at http://localhost:${PORT}${PREFIX}/`));
