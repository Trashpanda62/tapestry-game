import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pages = ['index.html', 'experiences.html', 'shop.html', 'animals.html', 'meet-the-herd.html', 'rv-rentals.html'];
const siteRoot = 'https://trashpanda62.github.io/tapestry-game/';
const htmlByPage = new Map(await Promise.all(pages.map(async (page) => [
  page,
  await readFile(new URL(`./${page}`, import.meta.url), 'utf8'),
])));

test('pages have unique titles and canonical URLs', () => {
  const titles = [];
  const canonicals = [];

  for (const [page, html] of htmlByPage) {
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
    const titleMatches = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
    const canonicalMatches = [...head.matchAll(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)];
    assert.equal(titleMatches.length, 1, `${page} must have exactly one title`);
    assert.equal(canonicalMatches.length, 1, `${page} must have exactly one canonical link`);
    titles.push(titleMatches[0][1].trim());
    canonicals.push(canonicalMatches[0][1]);
  }

  assert.equal(new Set(titles).size, pages.length, 'page titles must be unique');
  assert.equal(new Set(canonicals).size, pages.length, 'canonical URLs must be unique');
});

test('sitemap lists every page URL', async () => {
  const sitemap = await readFile(new URL('./sitemap.xml', import.meta.url), 'utf8');
  const expectedUrls = pages.map((page) => page === 'index.html' ? siteRoot : siteRoot + page);

  for (const url of expectedUrls) {
    assert.match(sitemap, new RegExp(`<loc>\\s*${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*</loc>`), `sitemap is missing ${url}`);
  }
});

test('robots.txt references the sitemap', async () => {
  const robots = await readFile(new URL('./robots.txt', import.meta.url), 'utf8');
  assert.match(robots, /^Sitemap:\s*https:\/\/trashpanda62\.github\.io\/tapestry-game\/sitemap\.xml\s*$/im);
});

test('structured data is valid JSON or syntactically sound JavaScript', () => {
  const indexHtml = htmlByPage.get('index.html');
  const indexBlocks = [...indexHtml.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(indexBlocks.length > 0, 'index.html is missing JSON-LD');
  for (const block of indexBlocks) JSON.parse(block[1]);

  // shop.html and experiences.html build their JSON-LD dynamically from the
  // live feed (real skus/prices/checkout_urls, not a static snapshot) --
  // verify the injection pattern instead of a static <script> block.
  for (const page of ['experiences.html', 'shop.html']) {
    const html = htmlByPage.get(page);
    const scripts = [...html.matchAll(/<script\b(?![^>]*\btype=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi)];
    assert.ok(scripts.length > 0, `${page} is missing inline JavaScript`);
    for (const script of scripts) new Function(script[1]);
    assert.match(html, /function addStructuredData\(/, `${page} is missing an addStructuredData function`);
    assert.match(html, /script\.type=['"]application\/ld\+json['"]/, `${page} does not set script.type to application/ld+json`);
    assert.match(html, /script\.textContent=JSON\.stringify\(data\)/, `${page} does not serialize data via JSON.stringify`);
    assert.match(html, /document\.head\.appendChild\(script\)/, `${page} does not append the JSON-LD script to <head>`);
  }
  assert.match(htmlByPage.get('shop.html'), /featured\.length>=8/, 'shop.html JSON-LD is not capped to <=8 featured products');
});
