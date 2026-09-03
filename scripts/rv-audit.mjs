import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = await readFile(join(root, "dist", "rv-rentals.html"), "utf8");
for (const phrase of ["$270", "10%", "50%", "$500", "$400", "$4/mile", "__lead"]) if (!html.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`[rv] missing ${phrase} fact or lead marker.`);
// All three ways to stay are offered side by side. This used to look for a `supplied-rv`
// id in a separate "Start with your rig" hub that asked the same question the stay cards
// answer; that hub is gone, so assert the cards themselves rather than the removed hub.
for (const [label, marker] of [
  ["bring your own", 'class="stay-card byo"'],
  ["on the farm", 'class="stay-card farm"'],
  ["delivered", 'class="stay-card delivery"']
]) if (!html.includes(marker)) throw new Error(`[rv] the "${label}" stay option is missing from the stay cards.`);
// BYO has to reach the same lead form as the other two. It shipped as a mailto for
// months, which quietly sent those guests to an inbox instead of the booking flow.
if (!/<a\b[^>]*\bdata-byo=[^>]*\bhref="[^"]*#booking"/.test(html) && !/<a\b[^>]*href="[^"]*#booking"[^>]*\bdata-byo=/.test(html)) {
  throw new Error("[rv] the BYO card does not route to the booking form.");
}
for (const stale of ["$220", "$80", "$300"]) if (html.includes(stale)) throw new Error(`[rv] stale value remains: ${stale}.`);

// Availability now reads live from the platform so the farm's own /rv-admin edits
// appear here without a republish. That is only safe because the baked
// bookings.json stays in the bundle as a fallback — without it, one API hiccup
// empties the calendar on the page whose entire job is showing what is free.
// All three halves are load-bearing: the live read, the fallback, and the timeout
// that stops a hanging API from stalling the page forever.
if (!html.includes("/api/rv/blocks")) throw new Error("[rv] the stay calendar no longer reads live availability from the platform.");
if (!/fetch\('bookings\.json'/.test(html)) throw new Error("[rv] the baked bookings.json fallback was removed — an API outage would blank the calendar.");
if (!/Promise\.race/.test(html)) throw new Error("[rv] the live-availability timeout guard was removed; a hanging API would stall the calendar indefinitely.");
await readFile(join(root, "dist", "bookings.json"), "utf8");

console.log("[rv] PASS: all three stay options present, BYO routes to the lead form, live availability reads the platform with a baked fallback and timeout, current rates/deposit facts and Obscura lead action are in place; stale values absent.");
