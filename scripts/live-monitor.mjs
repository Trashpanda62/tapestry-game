import fs from 'node:fs/promises';

const origin = process.env.TAPESTRY_ORIGIN || 'https://sites.obscurastudio.design';
const base = `${origin}/s/tapestry-acres`;
const durationMs = Number(process.env.MONITOR_DURATION_MS || 120_000);
const intervalMs = Number(process.env.MONITOR_INTERVAL_MS || 30_000);
const end = Date.now() + durationMs;
const rows = [];

while (Date.now() <= end) {
  const startedAt = new Date().toISOString();
  const checks = [];
  for (const route of ['/', '/experiences', '/shop', '/stay', '/herd']) {
    try {
      const response = await fetch(`${base}${route}`, { redirect: 'manual' });
      checks.push({ route, status: response.status, ok: response.status === 200 || (route === '/' && response.status === 308) });
    } catch (error) {
      checks.push({ route, status: null, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  rows.push({ at: startedAt, checks });
  if (Date.now() + intervalMs > end) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

const pass = rows.length > 0 && rows.every((row) => row.checks.every((check) => check.ok));
const report = { generatedAt: new Date().toISOString(), origin, durationMs, intervalMs, pass, alertCount: rows.flatMap((row) => row.checks.filter((check) => !check.ok)).length, rows };
await fs.writeFile('docs/live-monitor.json', `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile('docs/live-monitor.md', `# Live monitor\n\nRead-only canonical route monitor. Generated ${report.generatedAt}.\n\n- Window: ${Math.round(durationMs / 1000)} seconds\n- Probes: ${rows.length}\n- Decision: **${pass ? 'PASS' : 'ALERT'}**\n- Alerts: ${report.alertCount}\n- Kill switch: active release pointer remains available for atomic rollback; no rollback was triggered.\n`);
console.log(JSON.stringify({ pass, probes: rows.length, alertCount: report.alertCount }));
if (!pass) process.exitCode = 1;
