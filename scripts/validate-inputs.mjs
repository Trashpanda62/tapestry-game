import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";

const voidElements = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

function fail(file, message) {
  throw new Error(`[validate] ${file}: ${message}`);
}

async function requirePath(root, relativePath, kind) {
  try {
    const details = await lstat(join(root, relativePath));
    if ((kind === "file" && !details.isFile()) || (kind === "directory" && !details.isDirectory())) {
      fail(relativePath, `required ${kind} is missing.`);
    }
  } catch {
    fail(relativePath, `required ${kind} is missing.`);
  }
}

function validateHtml(file, html) {
  if (!/^\s*<!doctype\s+html\s*>/i.test(html)) fail(file, "missing <!doctype html>.");
  for (const element of ["html", "head", "body"]) {
    if (!new RegExp(`<${element}\\b`, "i").test(html) || !new RegExp(`</${element}\\s*>`, "i").test(html)) {
      fail(file, `missing <${element}> structure.`);
    }
  }

  const stripped = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const stack = [];
  const tags = /<\/?([A-Za-z][\w:-]*)\b[^>]*>/g;
  let match;
  while ((match = tags.exec(stripped))) {
    const tag = match[1].toLowerCase();
    if (match[0].startsWith("</")) {
      if (stack.pop() !== tag) fail(file, `mismatched closing tag </${tag}>.`);
    } else if (!voidElements.has(tag) && !match[0].endsWith("/>")) {
      stack.push(tag);
    }
  }
  if (stack.length) fail(file, `unclosed <${stack.at(-1)}> tag.`);
}

function validateData(file, data) {
  if (file === "animals.json" && (!data || !Array.isArray(data.groups) || !Array.isArray(data.forSale))) {
    fail(file, "expected groups and forSale arrays.");
  }
  if (file === "bookings.json" && (!data || !Array.isArray(data.bookings))) fail(file, "expected a bookings array.");
  if (["experiences.json", "store-products.json"].includes(file) && !Array.isArray(data)) {
    fail(file, "expected a JSON array.");
  }
}

export async function validateInputs(root, config) {
  for (const directory of config.assetDirectories) await requirePath(root, directory, "directory");
  for (const file of [...config.routes.map(({ source }) => source), ...config.rootFiles, ...config.dataFiles, "src/featured-skus.json"]) {
    await requirePath(root, file, "file");
  }

  const outputFiles = new Set();
  for (const route of config.routes) {
    if (outputFiles.has(route.source)) fail(route.source, "duplicate route output.");
    outputFiles.add(route.source);
    validateHtml(route.source, await readFile(join(root, route.source), "utf8"));
  }

  for (const file of config.dataFiles) {
    try {
      const data = JSON.parse(await readFile(join(root, file), "utf8"));
      validateData(file, data);
    } catch (error) {
      if (error.message.startsWith("[validate]")) throw error;
      fail(file, `invalid JSON (${error.message}).`);
    }
  }
}
