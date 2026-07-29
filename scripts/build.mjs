import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalBasePath, tenantUrl } from "../src/base-path.mjs";
import { buildContentPack } from "./build-content-pack.mjs";
import { generateCatalog } from "./generate-catalog.mjs";
import { packageAssets } from "./package-assets.mjs";
import { mirrorHerd } from "./mirror-herd.mjs";
import { validateInputs } from "./validate-inputs.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const configFile = JSON.parse(await readFile(join(root, "src", "build-config.json"), "utf8"));
const config = { ...configFile, basePath: canonicalBasePath, publicOrigin: process.env.TAPESTRY_PUBLIC_ORIGIN || configFile.publicOrigin };
const dist = join(root, "dist");
const fail = (message) => { throw new Error(`[build] ${message}`); };
const routeBySource = Object.fromEntries(config.routes.map(({ source, path }) => [source, path]));
const legacySourceRoutes = {
  "index.html": "/",
  "animals.html": "/animals",
  "experiences.html": "/experiences",
  "meet-the-herd.html": "/herd",
  "rv-rentals.html": "/stay",
  "shop.html": "/shop",
  "bag.html": "/bag",
  "checkout.html": "/checkout",
  "404.html": "/404",
  "thanks.html": "/thanks"
};
const lockedAttrs = 'data-hero="documentary" data-palette="pasture-ochre" data-typography="sturdy-slab" data-surface="painted-sign" data-illustration="accent" data-density="comfortable" data-motion="lively" data-nav="rail" data-calendar-layout="month-grid" data-facet-layout="left-rail" data-quickview-style="modal"';
const previewBuild = process.env.TAPESTRY_PREVIEW === "1";
const unpublishedPreviewAssets = new Set(["preset-switcher.js", "preset-switcher.css", "design-selector.js", "surface-selector.js"]);
if (previewBuild) {
  unpublishedPreviewAssets.delete("preset-switcher.js");
  unpublishedPreviewAssets.delete("preset-switcher.css");
  unpublishedPreviewAssets.delete("surface-selector.js");
}

if (config.basePath !== canonicalBasePath) fail("build config basePath must match the canonical base-path helper.");
if (typeof config.publicOrigin !== "string" || !/^https:\/\/[^/]+$/.test(config.publicOrigin)) fail("build config publicOrigin must be an explicit HTTPS origin.");
await validateInputs(root, config);
const media = await packageAssets(root);
await rm(dist, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
await mkdir(dist, { recursive: true });
await buildContentPack(root, dist);

const copied = [];
async function copy(relativePath) {
  const source = join(root, relativePath);
  const target = join(dist, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { force: true, preserveTimestamps: false });
  if (relativePath.endsWith(".html")) {
    let html = await readFile(target, "utf8");
    // Published tenant pages are served at `/s/tapestry-acres/<route>` and
    // the root route itself has no trailing slash. Establish the tenant as
    // the document base so relative CSS, scripts, images, data fetches, and
    // legacy page links resolve consistently on every route.
    if (!/<base\b/i.test(html)) {
      html = html.replace(/<head(\s[^>]*)?>/i, `$&\n  <base href="${config.basePath}/">`);
    }
    html = html.replace(/<html(\s[^>]*)?>/i, (match) => match.includes("data-hero=") ? match : match.replace(/>$/, ` ${lockedAttrs}>`));
    for (const [legacy, canonical] of Object.entries(legacySourceRoutes)) {
      const destination = tenantUrl(canonical);
      html = html.replaceAll(`href="${legacy}"`, `href="${destination}"`);
      html = html.replaceAll(`href='./${legacy}'`, `href="${destination}"`);
      html = html.replaceAll(`href="${legacy}?`, `href="${destination}?`);
    }
    // Canonicalize absolute GitHub-era URLs embedded in JSON-LD/OG metadata
    // and inline data as well as ordinary hrefs. No published page may point
    // back to the retired static host or retain a .html route.
    html = html.replaceAll("https://trashpanda62.github.io/tapestry-game", `${config.publicOrigin}${canonicalBasePath}`);
    for (const [legacy, canonical] of Object.entries(legacySourceRoutes)) {
      html = html.replaceAll(`${canonicalBasePath}/${legacy}`, tenantUrl(canonical));
    }
    // The source shop page retains a text-only legacy renderer as migration
    // reference. Never publish that old Square-link implementation; the
    // first-party `assets/shop.js` owns the rendered store surface.
    if (relativePath === "shop.html") html = html.replace(/<script\s+type="text\/plain"\s+data-legacy-catalog-renderer>[\s\S]*?<\/script>/i, "");
    if (!html.includes('id="skip-to-content"')) html = html.replace(/<body([^>]*)>/i, '<body$1><a id="skip-to-content" class="skip-link" href="#main-content">Skip to content</a>');
    if (!html.includes('src="assets/site-shell.js"')) html = html.replace(/<\/head>/i, '  <script src="assets/site-shell.js" defer></script>\n</head>');
    if (!html.includes('src="assets/state-skeletons.js"')) html = html.replace(/<\/head>/i, '  <script src="assets/state-skeletons.js" defer></script>\n</head>');
    if (!html.includes('src="assets/journey-analytics.js"')) html = html.replace(/<\/head>/i, '  <script src="assets/journey-analytics.js" defer></script>\n</head>');
    if (!/<main[^>]*id="main-content"/i.test(html)) html = html.replace(/<main(\s|>)/i, '<main id="main-content"$1');
    await writeFile(target, html);
  } else if (previewBuild && relativePath.replaceAll("\\", "/").startsWith("assets/") && relativePath.endsWith(".js")) {
    const script = await readFile(target, "utf8");
    await writeFile(target, script.replaceAll(configFile.basePath, config.basePath));
  } else if (relativePath === "sitemap.xml") {
    const urls = config.routes.filter(({ path }) => !['/404', '/thanks'].includes(path)).map(({ path }) => `  <url><loc>${config.publicOrigin}${tenantUrl(path)}</loc></url>`).join("\n");
    await writeFile(target, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  } else if (relativePath === "robots.txt") {
    await writeFile(target, `User-agent: *\nAllow: /\n\nSitemap: ${config.publicOrigin}${tenantUrl("/sitemap.xml")}\n`);
  }
  const bytes = await readFile(target);
  copied.push({
    file: relativePath.replaceAll("\\", "/"),
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

async function copyTree(directory) {
  const source = join(root, directory);
  const entries = (await readdir(source, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await copyTree(path);
    else if (entry.isFile() && entry.name !== ".gitkeep" && !["field-kit-source.png", "field-kit.png", "field-kit-1x.png"].includes(entry.name) && !unpublishedPreviewAssets.has(entry.name)) await copy(path);
  }
}

async function emitRouteAlias(source, routePath) {
  if (routePath === "/" || routePath === "/herd") return;
  const alias = join(routePath.replace(/^\//, ""), "index.html");
  const bytes = await readFile(join(dist, source));
  await mkdir(dirname(join(dist, alias)), { recursive: true });
  await writeFile(join(dist, alias), bytes);
  copied.push({
    file: alias.replaceAll("\\", "/"),
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

for (const { source, path } of config.routes) {
  await copy(source);
  await emitRouteAlias(source, path);
}
if (previewBuild) await copy("surface-preview.html");
for (const file of config.rootFiles) await copy(file);
for (const directory of config.assetDirectories) await copyTree(directory);
for (const generated of await generateCatalog(root, dist)) {
  const bytes = await readFile(join(dist, generated));
  copied.push({ file: generated, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
}
copied.push(...await mirrorHerd(dist));

/* Cache-bust the shared CSS/JS. The published bundle is served with
   `Cache-Control: public, max-age=14400`, so without a versioned URL a returning
   visitor runs up to four hours of stale site.css / site-shell.js against fresh HTML
   (the HTML itself is only cached for 60s). A content hash in the query makes every
   deploy self-busting while keeping the long asset TTL, which is the point of it. */
const bustable = new Map();
for (const entry of copied) {
  if (/^assets\/[^/]+\.(?:css|js)$/.test(entry.file)) bustable.set(entry.file.slice("assets/".length), entry.sha256.slice(0, 8));
}
for (const entry of copied) {
  if (!entry.file.endsWith(".html")) continue;
  const target = join(dist, entry.file);
  const before = await readFile(target, "utf8");
  let html = before;
  for (const [name, version] of bustable) {
    html = html.replaceAll(`"assets/${name}"`, `"assets/${name}?v=${version}"`);
    html = html.replaceAll(`'assets/${name}'`, `'assets/${name}?v=${version}'`);
  }
  if (html === before) continue;
  await writeFile(target, html);
  const bytes = Buffer.from(html, "utf8");
  entry.bytes = bytes.byteLength;
  entry.sha256 = createHash("sha256").update(bytes).digest("hex");
}

const redirects = Object.entries(legacySourceRoutes)
  .filter(([legacy]) => legacy !== "404.html")
  .map(([legacy, canonical]) => `/${legacy} ${tenantUrl(canonical)} 308!`)
  .concat([`/* ${tenantUrl("/404")} 404`])
  .join("\n") + "\n";
await writeFile(join(dist, "_redirects"), redirects);
copied.push({ file: "_redirects", bytes: Buffer.byteLength(redirects), sha256: createHash("sha256").update(redirects).digest("hex") });

const files = copied.sort((a, b) => a.file.localeCompare(b.file));
const assets = files.filter(({ file }) => config.assetDirectories.some((directory) => file.startsWith(`${directory}/`)));
const routes = config.routes.map(({ source, path }) => ({ file: source, route: tenantUrl(path) }));
await writeFile(join(dist, "asset-manifest.json"), `${JSON.stringify({ basePath: canonicalBasePath, publicOrigin: config.publicOrigin, assets, media }, null, 2)}\n`);
await writeFile(join(dist, "route-manifest.json"), `${JSON.stringify({ basePath: canonicalBasePath, publicOrigin: config.publicOrigin, routes, files }, null, 2)}\n`);

console.log(`[build] ${files.length} files -> ${relative(root, dist)}`);
