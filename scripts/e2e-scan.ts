/** @internal Exercise all four Scan API operations with benign content and bounded polling. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { init, Scanner, Content, ManagementClient } from '../src/index.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
try {
  init({ numRetries: 0 });
  const scanner = new Scanner();
  const management = new ManagementClient({ numRetries: 0 });
  const profiles = await harness.check('scan.fixture.profile', () =>
    management.profiles.list({ limit: 100 }),
  );
  const profile = profiles?.ai_profiles.find((p) => p.active && p.profile_name);
  if (!profile) throw new Error('No active scan profile available');
  const ref = { profile_name: profile.profile_name };
  const sync = await harness.check('scan.sync', () =>
    scanner.syncScan(
      ref,
      new Content({ prompt: 'What is two plus two?', response: 'Two plus two is four.' }),
      { trId: `sdk-e2e-${randomUUID()}`, numRetries: 0 },
    ),
  );
  if (sync) {
    await harness.check('scan.sync.results', async () => {
      const rows = await scanner.queryByScanIds([sync.scan_id], { numRetries: 0 });
      assert(rows.some((row) => row.scan_id === sync.scan_id));
    });
    await harness.check('scan.sync.reports', async () => {
      const rows = await scanner.queryByReportIds([sync.report_id], { numRetries: 0 });
      assert(rows.some((row) => row.report_id === sync.report_id));
    });
  }
  const async = await harness.check('scan.async.flat-batch', () =>
    scanner.asyncScan(
      [
        { req_id: 1, scan_req: { ai_profile: ref, contents: [{ prompt: 'Please say hello.' }] } },
        {
          req_id: 2,
          scan_req: { ai_profile: ref, contents: [{ prompt: 'Name a primary color.' }] },
        },
      ],
      { numRetries: 0 },
    ),
  );
  if (async) {
    await harness.check('scan.async.results.complete', async () => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const rows = await scanner.queryByScanIds([async.scan_id], { numRetries: 0 });
        if ([1, 2].every((id) => rows.some((row) => row.req_id === id && row.result))) return;
        await delay(1500);
      }
      throw new Error('Async scan did not complete within the polling budget');
    });
    if (async.report_id)
      await harness.check('scan.async.reports.cardinality', async () => {
        const rows = await scanner.queryByReportIds([async.report_id!], { numRetries: 0 });
        assert([1, 2].every((id) => rows.some((row) => row.req_id === id)));
      });
  }
} finally {
  credentials.verifyUnchanged();
  harness.finish('scan', true);
}
