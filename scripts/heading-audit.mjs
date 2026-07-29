import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const routes = ["index.html", "animals.html", "experiences.html", "meet-the-herd.html", "rv-rentals.html", "shop.html", "404.html", "thanks.html"];
for (const route of routes) {
  const html = await readFile(join(root, "dist", route), "utf8");
  const count = (html.match(/<h1(?:\s|>)/gi) || []).length;
  if (count !== 1) throw new Error(`[headings] ${route} has ${count} H1 elements.`);
}
const blueprint = await readFile(join(root, "docs", "ia-blueprint.md"), "utf8");
for (const phrase of ["What is this place?", "What can I book?", "What should I expect?", "Who will I meet?", "How do I stay?", "How do I buy?"]) {
  if (!blueprint.includes(phrase)) throw new Error(`[headings] IA blueprint missing: ${phrase}`);
}
console.log(`[headings] PASS: ${routes.length} routes have one H1 and visitor-question IA is documented.`);
