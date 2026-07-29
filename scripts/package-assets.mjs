import { createHash } from "node:crypto";
import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const encoderByFormat = { avif: "libaom-av1", webp: "libwebp" };

function fail(message) {
  throw new Error(`[assets] ${message}`);
}

async function imageDimensions(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", file]);
  const stream = JSON.parse(stdout).streams?.[0];
  if (!Number.isInteger(stream?.width) || !Number.isInteger(stream?.height)) fail(`${file}: missing image dimensions.`);
  return { width: stream.width, height: stream.height };
}

async function supportedFormats() {
  try {
    const { stdout, stderr } = await run("ffmpeg", ["-hide_banner", "-encoders"]);
    const encoders = `${stdout}${stderr}`;
    return new Set(Object.entries(encoderByFormat).filter(([, encoder]) => encoders.includes(encoder)).map(([format]) => format));
  } catch {
    return new Set();
  }
}

async function outputRecord(root, relativePath, format, name, requestedWidth, maxBytes) {
  const file = join(root, relativePath);
  const [bytes, dimensions] = await Promise.all([readFile(file), imageDimensions(file)]);
  return {
    file: relativePath.replaceAll("\\", "/"),
    format,
    name,
    requestedWidth,
    ...dimensions,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(maxBytes ? { maxBytes } : {})
  };
}

async function render(source, target, width, format, webpQuality) {
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", source, "-frames:v", "1", "-vf", `scale=${width}:-2:flags=lanczos`];
  if (format === "avif") args.push("-c:v", "libaom-av1", "-still-picture", "1", "-crf", "32", "-cpu-used", "8");
  if (format === "webp") args.push("-c:v", "libwebp", "-preset", "picture", "-quality", String(webpQuality));
  args.push(target);
  await run("ffmpeg", args);
}

export async function packageAssets(root) {
  const spec = JSON.parse(await readFile(join(root, "src", "asset-package.json"), "utf8"));
  if (spec.schemaVersion !== 1 || !Array.isArray(spec.images) || !Array.isArray(spec.routeCriticalFonts)) fail("asset package config is invalid.");
  const supported = await supportedFormats();
  const images = [];

  for (const image of [...spec.images].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!image.id || !image.source || !Array.isArray(image.variants) || !Array.isArray(image.formats)) fail("image entries require id, source, variants, and formats.");
    const source = join(root, image.source);
    await access(source);
    const dimensions = await imageDimensions(source);
    const variants = [];
    for (const variant of [...image.variants].sort((a, b) => a.width - b.width || a.name.localeCompare(b.name))) {
      if (!Number.isInteger(variant.width) || variant.width < 1) fail(`${image.id}: invalid variant width.`);
      const files = [];
      for (const format of image.formats) {
        if (!supported.has(format)) continue;
        const relativePath = `public/media/${image.id}-${variant.width}.${format}`;
        const target = join(root, relativePath);
        await mkdir(dirname(target), { recursive: true });
        await render(source, target, variant.width, format, image.webpQuality ?? 78);
        files.push(await outputRecord(root, relativePath, format, variant.name, variant.width, variant.maxBytes));
      }
      if (!files.length) fail(`${image.id}: no configured output format is supported by local tooling.`);
      variants.push({ name: variant.name, width: variant.width, files: files.sort((a, b) => a.format.localeCompare(b.format)) });
    }
    const srcset = {};
    for (const variant of variants) {
      for (const file of variant.files) (srcset[file.format] ??= []).push({ file: file.file, width: file.width, height: file.height });
    }
    images.push({ id: image.id, source: image.source, kind: image.kind, dimensions, focal: image.focal, srcset, variants });
  }

  return { schemaVersion: spec.schemaVersion, images, routeCriticalFonts: spec.routeCriticalFonts.map((file) => ({ file, maxBytes: 100000 })) };
}
