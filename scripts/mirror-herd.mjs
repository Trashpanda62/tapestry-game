import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

// The herd mirror ships from a committed snapshot of what was live on 2026-11-23 (inlined thumbnails,
// /s/tapestry-acres/herd base already applied). Building straight from C:/dev/tapestry-herd began shipping a
// newer herd.json whose thumbnails point at img/ files this bundle does not carry (24 broken photos on /herd).
const herdRoot = resolve(new URL("../herd-snapshot", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const verbatim = true;
const files = ["index.html", "herd.json", "icon.svg", "manifest.webmanifest", "sw.js", ".nojekyll"];

export async function mirrorHerd(dist) {
  const targetRoot = join(dist, "herd");
  await mkdir(targetRoot, { recursive: true });
  const records = [];
  for (const file of files) {
    const source = join(herdRoot, file);
    let body = await readFile(source, "utf8");
    if (!verbatim && file === "index.html") {
      body = body.replace(/const BASE = \(\(\) => \{[\s\S]*?\}\)\(\);/, "const BASE = '/s/tapestry-acres/herd';");
      body = body.replace("navigator.serviceWorker.register('sw.js')", "navigator.serviceWorker.register('/s/tapestry-acres/herd/sw.js', {scope: '/s/tapestry-acres/herd/'})");
    }
    if (!verbatim && file === "sw.js") {
      body = body.replace("const SHELL = 'herd-shell-v12';", "const SHELL = 'herd-shell-v12-obscura';");
    }
    const output = join(targetRoot, file);
    await writeFile(output, body);
    records.push({ file: `herd/${file}`, bytes: Buffer.byteLength(body), sha256: createHash("sha256").update(body).digest("hex") });
  }
  return records;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(await mirrorHerd(join(decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1").replace(/\/$/, ""), "dist")), null, 2));
}
