/**
 * Link audit: every anchor in dist/, with the URL a browser will actually resolve.
 *
 * Exists because of a bug that shipped silently. The build injects
 * `<base href="/s/tapestry-acres/">` so relative assets resolve on every route.
 * That base ALSO captures bare fragment links, so `href="#booking"` on /stay
 * resolved to `/s/tapestry-acres/#booking` — the HOME page — and every in-page
 * anchor navigated away instead of scrolling. Seven of ten buttons on the RV page
 * were dead this way. Nothing caught it because each href was individually valid.
 *
 * Fails on:
 *   - a fragment link whose resolved path is not the page it sits on
 *   - a fragment target that does not exist on that page
 *   - a `.html` route that the publisher would not canonicalize
 *   - a query parameter no code reads (the `?add=` class of dead link)
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalBasePath, tenantUrl } from "../src/base-path.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dist = join(root, "dist");
const routes = JSON.parse(await readFile(join(root, "src", "build-config.json"), "utf8")).routes;
const routeBySource = Object.fromEntries(routes.map(({ source, path }) => [source, path]));

// Query params that some script actually reads. Anything else in a link is dead.
const LIVE_PARAMS = new Set(["experience", "q", "cat" /* shop.js parseList(params, "cat") */, "state", "add_to_bag", "sku",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "print"]);

const failures = [];
const rows = [];

const idCache = new Map();
async function pageIds(file) {
  if (!idCache.has(file)) {
    const html = await readFile(join(dist, file), "utf8");
    idCache.set(file, new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}

const htmlFiles = (await readdir(dist)).filter((f) => f.endsWith(".html"));

for (const file of htmlFiles) {
  const route = routeBySource[file];
  if (!route) continue;
  const pageUrl = `https://example.invalid${tenantUrl(route)}`;
  const html = await readFile(join(dist, file), "utf8");

  const baseMatch = html.match(/<base\b[^>]*href=["']([^"']+)["']/i);
  const baseHref = baseMatch ? new URL(baseMatch[1], pageUrl).toString() : pageUrl;

  const ids = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
  const anchors = [...html.matchAll(/<a\b[^>]*?\bhref=["']([^"']*)["'][^>]*>/gi)].map((m) => m[1]);

  for (const href of anchors) {
    if (/^(mailto:|tel:|https?:\/\/(?!sites\.obscurastudio\.design))/i.test(href)) continue;
    let resolved;
    try { resolved = new URL(href, baseHref); } catch { failures.push(`${file}: unparseable href ${href}`); continue; }

    const onOwnPage = resolved.pathname === tenantUrl(route);
    const row = { file, route, href, resolved: resolved.pathname + resolved.search + resolved.hash };
    rows.push(row);

    if (resolved.hash) {
      // A BARE fragment (`href="#x"`) means "somewhere on this page". If it lands
      // anywhere else, the <base> tag captured it — that is the shipped bug.
      // An explicit cross-page fragment (`href="experiences#x"`) is legitimate;
      // it just has to point at an id that really exists over there.
      const authoredBare = href.startsWith("#");
      const target = decodeURIComponent(resolved.hash.slice(1));
      const hashRouted = target.includes("/"); // e.g. #rv/max-2, resolved by JS

      if (authoredBare && !onOwnPage) {
        failures.push(`${file} (${route}): bare fragment "${href}" resolves to ${resolved.pathname}${resolved.hash} — a DIFFERENT page. The <base> tag captured it.`);
      } else if (target && !hashRouted) {
        const targetFile = onOwnPage ? file : Object.entries(routeBySource).find(([, path]) => tenantUrl(path) === resolved.pathname)?.[0];
        if (!targetFile) {
          failures.push(`${file} (${route}): fragment link "${href}" points at unknown page ${resolved.pathname}.`);
        } else {
          const targetIds = targetFile === file ? ids : await pageIds(targetFile);
          if (!targetIds.has(target)) {
            failures.push(`${file} (${route}): fragment "${href}" has no matching id on ${targetFile}.`);
          }
        }
      }
    }

    if (resolved.pathname.endsWith(".html")) {
      const targetRoute = routeBySource[resolved.pathname.split("/").pop()];
      if (!targetRoute) failures.push(`${file}: link to ${resolved.pathname} is not a known route.`);
    }

    for (const key of resolved.searchParams.keys()) {
      if (!LIVE_PARAMS.has(key)) {
        failures.push(`${file} (${route}): link "${href}" passes ?${key}= which no script reads — dead parameter.`);
      }
    }
  }
}

const lines = [
  "# Link audit",
  "",
  `Generated from \`dist/\` · base path \`${canonicalBasePath}\` · ${rows.length} internal anchors across ${htmlFiles.length} pages.`,
  "",
  "Guards against the `<base href>` fragment bug: a bare `href=\"#x\"` resolves against the",
  "base, not the current route, so in-page anchors silently became links to the home page.",
  "",
  "| Page | Route | Authored href | Browser resolves to |",
  "| --- | --- | --- | --- |",
  ...rows.map((r) => `| ${r.file} | ${r.route} | \`${r.href}\` | \`${r.resolved}\` |`),
  ""
];

if (failures.length) {
  lines.push("## Failures", "", ...failures.map((f) => `- ${f}`), "");
}

await writeFile(join(root, "docs", "link-audit.md"), lines.join("\n"), "utf8");

if (failures.length) {
  console.error(`[link-audit] ${failures.length} broken link(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[link-audit] ${rows.length} internal anchors across ${htmlFiles.length} pages, all resolve correctly.`);
