import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dashboardExampleEvidence } from '../../scripts/e2e/generate-dashboard-example-docs.js';
import { dashboardExampleNames } from '../../scripts/e2e/dashboard-example-output.js';

describe('source-bound dashboard example evidence', () => {
  let directory: string;
  const startedAt = '2026-09-07T20:00:00.000Z';
  const finishedAt = '2026-09-07T20:01:00.000Z';
  const source = 'example source';
  const sourceSha256 = createHash('sha256').update(source).digest('hex');
  const capture = () => ({
    startedAt,
    finishedAt,
    credentialsUnchanged: true,
    contentRequested: false,
    mutations: false,
    output: dashboardExampleNames.map((script) => ({ script, sourceSha256, exitCode: 1 })),
  });
  const suite = () => ({
    startedAt,
    finishedAt,
    credentialsUnchanged: true,
    total: 2,
    passed: 0,
    failed: 2,
    skipped: 0,
    fixtures: [],
    results: dashboardExampleNames.map((name) => ({ name: `example.${name}`, status: 'FAIL' })),
  });
  const write = (path: string, value: unknown) =>
    writeFileSync(join(directory, path), JSON.stringify(value));
  const verify = () => dashboardExampleEvidence(pathToFileURL(directory + '/'));
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'airs-dashboard-example-evidence-'));
    for (const path of ['artifacts/examples', 'artifacts/e2e', 'docs-site/examples'])
      mkdirSync(join(directory, path), { recursive: true });
    for (const name of dashboardExampleNames)
      writeFileSync(join(directory, `docs-site/examples/${name}.ts`), source);
    write('artifacts/examples/dashboard-examples.json', capture());
    write('artifacts/e2e/dashboard-examples.json', suite());
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));

  it('retains executed failures without reclassifying them as passes', () => {
    expect(verify().suite.failed).toBe(2);
  });
  it('rejects stale executable-source hashes', () => {
    writeFileSync(join(directory, 'docs-site/examples/mgmt-dashboard-overview.ts'), 'changed');
    expect(verify).toThrow('Stale example capture');
  });
  it('rejects missing or duplicate example captures', () => {
    const value = capture();
    value.output.pop();
    write('artifacts/examples/dashboard-examples.json', value);
    expect(verify).toThrow();
    value.output.push(value.output[0]);
    write('artifacts/examples/dashboard-examples.json', value);
    expect(verify).toThrow();
  });
  it('rejects changed credentials, content reads or mutations', () => {
    for (const values of [
      { credentialsUnchanged: false },
      { contentRequested: true },
      { mutations: true },
    ]) {
      write('artifacts/examples/dashboard-examples.json', { ...capture(), ...values });
      expect(verify).toThrow();
    }
  });
  it('rejects mismatched counters and evidence from a different run', () => {
    write('artifacts/e2e/dashboard-examples.json', { ...suite(), passed: 1, failed: 1 });
    expect(verify).toThrow();
    write('artifacts/e2e/dashboard-examples.json', { ...suite(), startedAt: finishedAt });
    expect(verify).toThrow();
  });
});
