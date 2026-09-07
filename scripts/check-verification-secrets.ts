/** @internal Check deliverables for the read-only config's secrets without printing their values. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const configPath = join(homedir(), '.prisma-airs/config.json');
const original = readFileSync(configPath);
const config = JSON.parse(original.toString('utf8')) as Record<string, unknown>;
const keys = [
  ...new Set([
    'mgmtClientSecret',
    'airsApiKey',
    ...Object.keys(config).filter(
      (key) =>
        /secret|apiKey|apiToken|password/i.test(key) &&
        typeof config[key] === 'string' &&
        (config[key] as string).length > 6,
    ),
  ]),
];
const secrets = keys.flatMap((key) => {
  const value = config[key];
  assert(typeof value === 'string' && value.length > 6, `Missing expected credential: ${key}`);
  return [value, encodeURIComponent(value), Buffer.from(value).toString('base64')].map((v) =>
    Buffer.from(v),
  );
});
const leaks = new Set<string>();
let filesScanned = 0;
function scan(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (
      ['node_modules', '.git', '.docusaurus', 'build'].includes(entry.name) ||
      entry.isSymbolicLink()
    )
      continue;
    const file = join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (entry.isFile()) {
      const data = readFileSync(file);
      filesScanned++;
      if (secrets.some((secret) => data.includes(secret))) leaks.add(file);
    }
  }
}
for (const directory of ['src', 'scripts', 'test', 'docs-site', 'dist', 'artifacts'])
  scan(join(root, directory));
// Pass the unpacked npm consumer to verify the exact package payload as well as source artifacts.
for (const directory of process.argv.slice(2)) scan(resolve(directory));
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const credentialsUnchanged = digest(original) === digest(readFileSync(configPath));
const report = {
  checkedAt: new Date().toISOString(),
  filesScanned,
  leakedFileCount: leaks.size,
  credentialsUnchanged,
  passed: leaks.size === 0 && credentialsUnchanged,
};
mkdirSync(join(root, 'artifacts/security'), { recursive: true });
writeFileSync(
  join(root, 'artifacts/security/secret-scan.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report));
assert(
  report.passed,
  'Credential verification failed; inspect protected files locally without logging matches.',
);
