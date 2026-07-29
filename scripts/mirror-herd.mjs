import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const herdRoot = "C:/dev/tapestry-herd";
const files = ["index.html", "herd.json", "icon.svg", "manifest.webmanifest", "sw.js", ".nojekyll"];

export async function mirrorHerd(dist) {
  const targetRoot = join(dist, "herd");
  await mkdir(targetRoot, { recursive: true });
  const records = [];
  for (const file of files) {
    const source = join(herdRoot, file);
    let body = await readFile(source, "utf8");
    if (file === "index.html") {
      body = body.replace(/const BASE = \(\(\) => \{[\s\S]*?\}\)\(\);/, "const BASE = '/s/tapestry-acres/herd';");
      body = body.replace("navigator.serviceWorker.register('sw.js')", "navigator.serviceWorker.register('/s/tapestry-acres/herd/sw.js', {scope: '/s/tapestry-acres/herd/'})");
    }
    if (file === "sw.js") {
      body = body.replace("const SHELL = 'herd-shell-v11';", "const SHELL = 'herd-shell-v11-obscura';");
    }
    const output = join(targetRoot, file);
    await writeFile(output, body);
    records.push({ file: `herd/${file}`, bytes: Buffer.byteLength(body), sha256: createHash("sha256").update(body).digest("hex") });
  }
  return records;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  console.log(JSON.stringify(await mirrorHerd(join(resolve("C:/dev/tapestry-game"), "dist")), null, 2));
}
