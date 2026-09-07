/** @internal Read-only typed request-chart semantics against already journaled synthetic records. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AIGatewayClient, type AIGatewayRequestChartOptions } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const output: Record<string, unknown> = {};
try {
  const gateway = new AIGatewayClient({ numRetries: 0 });
  const original = JSON.parse(readFileSync('artifacts/e2e/gateway-observability.json', 'utf8')) as {
    credentialsUnchanged: boolean;
    failed: number;
    fixtures: { resource: string; id: string; name: string }[];
  };
  assert.equal(original.credentialsUnchanged, true);
  assert.equal(original.failed, 0);
  const owned = original.fixtures.find(
    (fixture) => fixture.resource === 'gateway.log-audit-record',
  );
  assert(owned);
  assert(owned.name.startsWith('sdk-e2e-inference-'));
  const end = new Date();
  const window = {
    workspaceSlug: 'ws-develo-71f8d8',
    start: new Date(end.getTime() - 86_400_000),
    end,
  } satisfies AIGatewayRequestChartOptions;
  const absentTrace = randomUUID();
  const control = await harness.check('analytics-requests.owned-log-control', async () => {
    const page = await gateway.telemetry.logs({ ...window, traceId: owned.id });
    assert(page.data.records.some((record) => record.trace_id === owned.id));
    return true;
  });
  assert(control, 'An existing owned log is required to verify filter semantics');
  await harness.check('analytics-requests.traceId.known-and-absent', async () => {
    const known = await gateway.telemetry.requests({ ...window, traceId: owned.id });
    const absent = await gateway.telemetry.requests({ ...window, traceId: absentTrace });
    assert.equal(known.data.total, 1);
    assert.equal(absent.data.total, 0);
    output.traceId = { knownTotal: known.data.total, absentTotal: absent.data.total };
  });
  await harness.check('analytics-requests.metadata.known-and-absent', async () => {
    const known = await gateway.telemetry.requests({
      ...window,
      metadata: { sdk_e2e: owned.name },
    });
    const absent = await gateway.telemetry.requests({
      ...window,
      metadata: { sdk_e2e: `absent-${absentTrace}` },
    });
    assert(typeof known.data.total === 'number' && known.data.total > 0);
    assert.equal(absent.data.total, 0);
    output.metadata = { knownMatched: known.data.total > 0, absentTotal: absent.data.total };
  });
} catch (error) {
  await harness.check('analytics-requests.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-analytics-request-filters', true);
  const report = JSON.parse(
    readFileSync('artifacts/e2e/gateway-analytics-request-filters.json', 'utf8'),
  ) as { finishedAt: string; passed: number; failed: number; total: number };
  writePrivateReport('artifacts/examples/gateway-analytics-request-filters.json', {
    capturedAt: report.finishedAt,
    credentialsUnchanged: true,
    mutations: false,
    suite: { passed: report.passed, failed: report.failed, total: report.total },
    output,
    disclosure:
      'Read-only typed SDK calls against previously journaled synthetic records. Known trace totals and absent-filter totals are actual values; known metadata counts are projected to a boolean. No tenant-wide counts or resource identifiers are published. Only request-count chart filters are verified, not equivalence across all analytics operations.',
  });
}
