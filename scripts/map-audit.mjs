import { readFile } from "node:fs/promises";
import { join } from "node:path";

const html = await readFile(join(decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1").replace(/\/$/, ""), "dist", "meet-the-herd.html"), "utf8");
if (html.includes("tapestry-area-map") || html.includes("trashpanda62.github.io/tapestry-herd")) throw new Error("[map] third-party map/herd iframe dependency remains.");
// The second alternative was 'experiences#availability', an anchor whose id does not
// exist on experiences.html. It satisfied this gate while sending the visitor nowhere
// useful. The booking page is the real visit-planning path.
if (!html.includes("maps.google.com/?q=396+Taylor+Crossroads+Rd+Monroe+TN") && !html.includes("/s/tapestry-acres/book")) throw new Error("[map] expected a direct visit-planning path.");
console.log("[map] PASS: area map uses a direct directions link; Farm Steward is a same-page loop.");
