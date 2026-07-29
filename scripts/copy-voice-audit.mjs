import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const routes = ['index.html', 'experiences.html', 'shop.html', 'animals.html', 'rv-rentals.html', 'meet-the-herd.html'];
const strip = (html) => html.replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi, ' ').replace(/\s+/g, ' ').trim();
const pages = await Promise.all(routes.map(async (route) => strip(await readFile(path.join(root, route), 'utf8'))));
const text = pages.join(' ');
const banned = /experience like no other|unforgettable|magical escape|where memories|something for everyone|immerse yourself|hidden gem|rustic charm/i;
if (banned.test(text)) throw new Error('[copy-voice] generic agritourism boilerplate found');
for (const fact of ['110 acres', 'Monroe', 'Dale Hollow', 'Highland', 'alpaca', 'pasture']) if (!new RegExp(fact, 'i').test(text)) throw new Error(`[copy-voice] concrete farm fact missing: ${fact}`);
const starts = [...text.matchAll(/(?:^|[.!?]\s+)([A-Z][a-z']+)/g)].map((m) => m[1].toLowerCase());
const counts = Object.fromEntries([...new Set(starts)].map((word) => [word, starts.filter((item) => item === word).length]));
if (Math.max(...Object.values(counts)) > 18) throw new Error('[copy-voice] one sentence opening dominates the public copy');
console.log(JSON.stringify({ routes: routes.length, bannedPhrases: 0, concreteFacts: 6, distinctSentenceOpeners: Object.keys(counts).length }));
console.log('[copy-voice] PASS: public copy uses concrete farm language, preserves source facts/names, and avoids generic agritourism boilerplate.');
