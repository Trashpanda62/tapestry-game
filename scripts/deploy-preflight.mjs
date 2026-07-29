import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const webstudio = path.resolve(root, '..', 'webstudio-tapestry-obscura-redesign');
const docsDir = path.join(root, 'docs');
const reportPath = path.join(docsDir, 'deploy-preflight.json');
const mdPath = path.join(docsDir, 'deploy-preflight.md');

function run(cmd, args, cwd) {
  try {
    return { ok: true, output: execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() };
  } catch (error) {
    return { ok: false, output: `${error.stdout ?? ''}${error.stderr ?? ''}`.trim(), code: error.status ?? 1 };
  }
}

function gitStatus(repo) {
  const result = run('git', ['status', '--short', '--branch'], repo);
  return { ok: result.ok, branch: result.output.split(/\r?\n/)[0] ?? '', lines: result.output.split(/\r?\n/).slice(1).filter(Boolean) };
}

const acceptance = JSON.parse(fs.readFileSync(path.join(docsDir, 'acceptance-matrix.json'), 'utf8'));
const migrationDir = path.join(webstudio, 'prisma', 'migrations', '0018_conversion_event');
const migrationSql = fs.readFileSync(path.join(migrationDir, 'migration.sql'), 'utf8');
const tapestryStatus = gitStatus(root);
const webstudioStatus = gitStatus(webstudio);
const envFiles = fs.readdirSync(webstudio, { withFileTypes: true })
  .filter(entry => entry.name === '.env' || entry.name.startsWith('.env.'))
  .map(entry => ({ name: entry.name, present: true, bytes: fs.statSync(path.join(webstudio, entry.name)).size }));
const hasRuntimeEnv = envFiles.some(file => file.name === '.env');
const migrationSafe = !/\bDROP\s+(TABLE|COLUMN)|\bTRUNCATE\b/i.test(migrationSql);
const checks = [
  { name: 'accepted-release-artifact', pass: acceptance.releaseHash?.length === 64 && acceptance.fileCount === 698 && acceptance.totalBytes > 0, detail: `hash=${acceptance.releaseHash}; files=${acceptance.fileCount}; bytes=${acceptance.totalBytes}` },
  { name: 'tapestry-lockfile', pass: fs.existsSync(path.join(root, 'package-lock.json')), detail: fs.existsSync(path.join(root, 'package-lock.json')) ? 'package-lock.json present' : 'package-lock.json absent; build currently relies on the checked-in package manifest only' },
  { name: 'webstudio-lockfile', pass: fs.existsSync(path.join(webstudio, 'package-lock.json')), detail: 'package-lock.json present' },
  { name: 'runtime-env-presence', pass: hasRuntimeEnv, detail: hasRuntimeEnv ? '.env present (values not read)' : '.env absent; only .env.example is present' },
  { name: 'migration-compatibility-scan', pass: migrationSafe, detail: migrationSafe ? 'conversion migration has no destructive DROP/TRUNCATE operations' : 'destructive migration operation detected' },
  { name: 'migration-backup', pass: false, detail: 'database backup cannot be verified without the deployment host and explicit credentials' },
  { name: 'active-release-snapshot', pass: false, detail: 'active release pointer/rollback id requires read-only access to the live publisher/storage' },
  { name: 'deployment-authorization', pass: false, detail: 'deploy.sh, migration, publish, and activation are outward-facing; no explicit authorization supplied' },
];
const go = checks.every(check => check.pass);
const report = {
  generatedAt: new Date().toISOString(),
  candidate: { acceptanceHash: acceptance.releaseHash, fileCount: acceptance.fileCount, totalBytes: acceptance.totalBytes },
  repos: { tapestry: tapestryStatus, webstudio: webstudioStatus },
  envFiles,
  migration: { path: path.relative(webstudio, path.join(migrationDir, 'migration.sql')), bytes: migrationSql.length, destructiveScanPass: migrationSafe },
  checks,
  decision: go ? 'GO' : 'NO-GO',
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const rows = checks.map(check => `| ${check.pass ? 'PASS' : 'HOLD'} | ${check.name} | ${check.detail} |`).join('\n');
fs.writeFileSync(mdPath, `# Deployment preflight\n\nRead-only preflight for the exact accepted Tapestry release. No remote command, migration, publish, activation, or rollback was executed.\n\n- Candidate hash: \`${acceptance.releaseHash}\`\n- Decision: **${report.decision}**\n- Generated: ${report.generatedAt}\n\n| Result | Check | Detail |\n| --- | --- | --- |\n${rows}\n\nA **NO-GO** is expected until Steve explicitly authorizes the outward-facing deployment and provides/opens the deployment context needed to capture the active-release snapshot and verify the database backup.\n`);

console.log(JSON.stringify({ decision: report.decision, acceptanceHash: acceptance.releaseHash, checks: checks.length, holds: checks.filter(check => !check.pass).map(check => check.name) }));
if (go) process.exit(0);
