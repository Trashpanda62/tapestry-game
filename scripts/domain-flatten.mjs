#!/usr/bin/env node
// Publish-time step for the custom-domain release. The bundle is built host-independent
// (base /s/tapestry-acres/), but every /s/tapestry-acres page 301s to tapestryacres.com,
// so each internal link cost visitors and crawlers one redirect hop. This copies dist to
// the output dir and rewrites HTML so the domain root is the base. JS reads the <base>
// tag at run time, so it follows. The herd mirror is left alone (service-worker scope).
//   node scripts/domain-flatten.mjs [inDir=dist] [outDir=dist-domain]
import { cp, readdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const [inDir = "dist", outDir = "dist-domain"] = process.argv.slice(2);
const slugPath = "/s/tapestry-acres";
await rm(outDir, { recursive: true, force: true });
await cp(inDir, outDir, { recursive: true });

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let changed = 0, refs = 0;
for await (const file of walk(outDir)) {
  const rel = path.relative(outDir, file).split(path.sep).join("/");
  if (!rel.endsWith(".html") || rel.startsWith("herd/")) continue;
  const html = await readFile(file, "utf8");
  // A slug path that starts a value ("/s/..., '/s/..., `/s/...) and ends the path or continues with / ? #.
  const next = html.replace(/(["'`])\/s\/tapestry-acres(?=[\/"'`?#])(\/?)/g, (_m, quote, slash) => { refs += 1; return `${quote}/`; });
  if (next !== html) { await writeFile(file, next); changed += 1; }
}
console.log(`[domain-flatten] ${changed} html files rewritten, ${refs} references -> ${outDir}`);
