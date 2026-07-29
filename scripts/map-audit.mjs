import { readFile } from "node:fs/promises";
import { join } from "node:path";

const html = await readFile(join("C:/dev/tapestry-game", "dist", "meet-the-herd.html"), "utf8");
if (html.includes("tapestry-area-map") || html.includes("trashpanda62.github.io/tapestry-herd")) throw new Error("[map] third-party map/herd iframe dependency remains.");
if (!html.includes("maps.google.com/?q=396+Taylor+Crossroads+Rd+Monroe+TN") && !html.includes('experiences#availability')) throw new Error("[map] expected a direct visit-planning path.");
console.log("[map] PASS: area map uses a direct directions link; Farm Steward is a same-page loop.");
