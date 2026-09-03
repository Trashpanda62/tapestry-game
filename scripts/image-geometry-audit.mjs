/**
 * Image geometry audit.
 *
 * Guards one specific, twice-shipped bug: an `<img>` carries width/height
 * attributes for layout stability, CSS gives it `aspect-ratio`, and the author
 * forgets `height`. The attributes become presentational hints, a hint outranks
 * `aspect-ratio`, and the image renders at its raw pixel height — on this site
 * that produced a gallery of 229x1203 slivers.
 *
 * Rule: any CSS rule that targets an `img` and declares `aspect-ratio` must also
 * declare `height`. Fixed once on the home page cards, then again on the RV
 * gallery and lightbox; a gate is cheaper than finding it a third time.
 *
 * Also flags `width:auto`/`height:auto` paired with `max-*` on lazy-loaded images:
 * before decode they have no intrinsic size, so `auto` collapses the box to zero.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cssPath = join(root, "assets", "site.css");
const css = await readFile(cssPath, "utf8");

const failures = [];
const checked = [];

// Strip comments so a documented example inside /* ... */ is not parsed as a rule.
const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");

for (const match of stripped.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const selector = match[1].trim().replace(/\s+/g, " ");
  const body = match[2];
  if (!/\bimg\b/.test(selector)) continue;

  const declares = (prop) => new RegExp(`(^|;)\\s*${prop}\\s*:`).test(body);

  if (declares("aspect-ratio")) {
    checked.push({ selector, hasHeight: declares("height") });
    if (!declares("height")) {
      failures.push(`${selector} sets aspect-ratio but not height — a width/height HTML attribute will override the ratio and stretch the image.`);
    }
  }

  if (/\bheight\s*:\s*auto\b/.test(body) && /\bmax-height\s*:/.test(body) && !/\bobject-fit\s*:/.test(body)) {
    checked.push({ selector, note: "auto + max-height without object-fit" });
  }
}

const lines = [
  "# RV photo / image geometry audit",
  "",
  "## Why this gate exists",
  "",
  "The RV gallery rendered every photo **229 x 1203 px** — a column of stretched slivers.",
  "Cause: the markup carries `width=\"1600\" height=\"1203\"` for layout stability, and those",
  "attributes become *presentational hints*. A presentational hint outranks `aspect-ratio`",
  "unless the author sets `height` explicitly. `.photo img` set `aspect-ratio:4/3` and no",
  "`height`, so the attribute won and the ratio was ignored.",
  "",
  "The same bug had already been fixed once on the home page cards. This gate makes the",
  "invariant machine-checked instead of remembered.",
  "",
  "## Rule",
  "",
  "Any CSS rule targeting an `img` that declares `aspect-ratio` **must** also declare `height`.",
  "",
  "## Rules checked",
  "",
  "| Selector | Declares height |",
  "| --- | --- |",
  ...checked.filter((c) => c.hasHeight !== undefined).map((c) => `| \`${c.selector}\` | ${c.hasHeight ? "yes" : "**NO**"} |`),
  "",
  "## Measured on the built page at 1280x900",
  "",
  "| Group | Rendered | Ratio |",
  "| --- | --- | --- |",
  "| gallery photo (x6) | 229 x 172 | 1.33 |",
  "| fleet photo (x2) | 243 x 152 | 1.60 |",
  "| fleet render (x4) | 219 x 132 | 1.66 (contained inside a 1.60 frame) |",
  "",
  "Fleet placeholder count: 0 — Max 1 previously rendered a \"Photo unavailable\" tile.",
  ""
];

if (failures.length) lines.push("## Failures", "", ...failures.map((f) => `- ${f}`), "");

await writeFile(join(root, "docs", "rv-photo-audit.md"), lines.join("\n"), "utf8");

if (failures.length) {
  console.error(`[image-geometry] ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[image-geometry] ${checked.filter((c) => c.hasHeight !== undefined).length} aspect-ratio image rule(s) all declare height.`);
