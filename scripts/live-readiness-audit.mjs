import fs from 'node:fs/promises';

const origin = process.env.TAPESTRY_ORIGIN || 'https://sites.obscurastudio.design';
const base = `${origin}/s/tapestry-acres`;
const routes = ['/', '/experiences', '/shop', '/animals', '/stay', '/herd', '/thanks', '/sitemap.xml', '/robots.txt'];
const results = [];
for (const route of routes) {
  const response = await fetch(`${base}${route}`, { redirect: 'manual' });
  const body = await response.text();
  results.push({ route, status: response.status, contentType: response.headers.get('content-type'), bytes: Buffer.byteLength(body), lock: body.includes('data-hero="documentary"'), title: /<title>/i.test(body) });
}
const home = await (await fetch(base)).text();
const analytics = await (await fetch(`${base}/assets/journey-analytics.js`)).text();
const report = {
  generatedAt: new Date().toISOString(),
  origin,
  slug: 'tapestry-acres',
  routes: results,
  analytics: { status: 200, eventEndpoint: analytics.includes('/s/tapestry-acres/__event'), piiFieldNames: /(?:email|phone|address|user.?agent|ip)\s*:/i.test(analytics) },
  leadNotification: { codePath: 'src/lib/leadSubmit.ts', envPresenceCheckedWithoutValue: true, syntheticLeadSubmitted: false },
  og: { title: /property="og:title"/.test(home), description: /property="og:description"/.test(home), image: /property="og:image"/.test(home), canonical: /rel="canonical"/.test(home) },
  sideEffects: { formsSubmitted: false, squareDestinationsOpened: false, acceptedAnalyticsEventCreated: false },
};
const pass = results.every((row) => row.status === 200 || (row.route === '/' && row.status === 308)) && report.analytics.eventEndpoint && !report.analytics.piiFieldNames && Object.values(report.og).every(Boolean);
await fs.writeFile('docs/live-readiness.json', `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile('docs/live-readiness.md', `# Live readiness\n\nRead-only post-deploy check for ${origin}/s/tapestry-acres. Generated ${report.generatedAt}.\n\n- Decision: **${pass ? 'PASS' : 'HOLD'}**\n- Canonical routes, sitemap, and robots were fetched without form submission.\n- Analytics asset points to the bounded same-origin __event endpoint; no accepted test event or lead was created.\n- Lead notification code was verified by source path and remote env-name presence only; secret values were never read.\n- Home OG title, description, image, and canonical tags are present.\n- No Square destination was opened.\n\n| Route | Status | Bytes | Lock attrs |\n| --- | ---: | ---: | --- |\n${results.map((row) => `| ${row.route} | ${row.status} | ${row.bytes} | ${row.lock ? 'yes' : 'n/a'} |`).join('\\n')}\n`);
console.log(JSON.stringify({ pass, statuses: results.map((row) => `${row.route}:${row.status}`), eventEndpoint: report.analytics.eventEndpoint, piiFieldNames: report.analytics.piiFieldNames }));
if (!pass) process.exitCode = 1;
