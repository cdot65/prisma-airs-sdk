import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveHarness } from '../../scripts/e2e/harness.js';

const directories: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('private E2E evidence', () => {
  it('atomically replaces a legacy report with owner-only permissions and valid JSON', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const directory = mkdtempSync(join(tmpdir(), 'sdk-evidence-'));
    directories.push(directory);
    writeFileSync(join(directory, 'offline.json'), 'old data', { mode: 0o644 });
    const harness = new LiveHarness(directory);
    await harness.check('offline.no-network', async () => ({ marker: true }));
    harness.finish('offline', true);
    const report = JSON.parse(readFileSync(join(directory, 'offline.json'), 'utf8'));
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(0);
    if (process.platform !== 'win32') {
      expect(statSync(join(directory, 'offline.json')).mode & 0o777).toBe(0o600);
      expect(statSync(join(directory, 'offline-response-shapes.json')).mode & 0o777).toBe(0o600);
    }
    expect(readdirSync(directory).some((name) => name.endsWith('.tmp'))).toBe(false);
  });

  it('retains every owned ID across atomic journal updates and reverses cleanup order', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const directory = mkdtempSync(join(tmpdir(), 'sdk-evidence-'));
    directories.push(directory);
    const harness = new LiveHarness(directory);
    harness.own('offline.parent', 'first', 'synthetic');
    harness.own('offline.child', 'second', 'synthetic');
    const file = readdirSync(directory).find((name) => name.startsWith('fixtures-'))!;
    expect(JSON.parse(readFileSync(join(directory, file), 'utf8'))).toEqual(harness.fixtures);
    if (process.platform !== 'win32')
      expect(statSync(join(directory, file)).mode & 0o777).toBe(0o600);
    const order: string[] = [];
    harness.defer('parent', async () => {
      order.push('parent');
    });
    harness.defer('child', async () => {
      order.push('child');
    });
    await harness.cleanup();
    expect(order).toEqual(['child', 'parent']);
    expect(harness.results.every((result) => result.status === 'PASS')).toBe(true);
    expect(readdirSync(directory).some((name) => name.endsWith('.tmp'))).toBe(false);
  });
});
