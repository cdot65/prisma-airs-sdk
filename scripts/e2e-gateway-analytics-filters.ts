/** @internal Read-only semantic checks: a 200 response alone does not verify an analytics filter. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { AIGatewayClient, AISecSDKException, ErrorType } from '../src/index.js';
import { DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { serializeWindow } from '../src/ai-gateway/window.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const evidence: {
  filter: string;
  baseline: number;
  known: number;
  absent: number;
  respected: boolean;
}[] = [];
try {
  const gateway = new AIGatewayClient({ numRetries: 0 });
  const original = JSON.parse(readFileSync('artifacts/e2e/gateway-observability.json', 'utf8')) as {
    credentialsUnchanged: boolean;
    failed: number;
    fixtures: { resource: string; id: string; name: string }[];
  };
  assert.equal(original.credentialsUnchanged, true);
  assert.equal(original.failed, 0);
  const owned = original.fixtures.find((f) => f.resource === 'gateway.log-audit-record');
  assert(owned);
  assert(owned.name.startsWith('sdk-e2e-inference-'));
  const end = new Date();
  const start = new Date(end.getTime() - 86_400_000);
  const window = { workspaceSlug: 'ws-develo-71f8d8', start, end };
  const control = await harness.check('analytics-filters.owned-log-control', async () => {
    const page = await gateway.telemetry.logs({ ...window, traceId: owned.id });
    assert(page.data.records.some((r) => r.trace_id === owned.id));
    return true;
  });
  assert(control);
  const token = await new OAuthClient({
    clientId: process.env.PANW_MGMT_CLIENT_ID!,
    clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
    tsgId: process.env.PANW_MGMT_TSG_ID!,
  }).getToken();
  harness.protect(token);
  const params = serializeWindow(process.env.PANW_MGMT_TSG_ID!, window);
  async function total(extra: Record<string, string> = {}): Promise<number> {
    const url = new URL(DEFAULT_AI_GW_DATA_ENDPOINT + '/logs/charts/requests');
    for (const [key, value] of Object.entries({ ...params, ...extra }))
      url.searchParams.set(key, value);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'x-tsg-id': process.env.PANW_MGMT_TSG_ID! },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new AISecSDKException(
        'Analytics filter request failed',
        response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
        { statusCode: response.status },
      );
    }
    const value = (await response.json()) as { data: { total: number } };
    assert(Number.isSafeInteger(value.data.total) && value.data.total >= 0);
    return value.data.total;
  }
  const baseline = await harness.check('analytics-filters.requests-control', async () => {
    const count = await total();
    assert(count > 0);
    return count;
  });
  assert(baseline !== undefined);
  const absentTrace = randomUUID();
  for (const filter of ['traceId', 'trace_id']) {
    await harness.check(`analytics-filters.${filter}.respected`, async () => {
      const known = await total({ [filter]: owned.id });
      const absent = await total({ [filter]: absentTrace });
      evidence.push({ filter, baseline, known, absent, respected: known === 1 && absent === 0 });
      assert.equal(known, 1, 'A known single trace must select exactly one request');
      assert.equal(absent, 0, 'An unknown trace must not return unfiltered analytics');
      return { known: 1, absent: 0 };
    });
  }
  await harness.check('analytics-filters.metadata.respected', async () => {
    const known = await total({ metadata: JSON.stringify({ sdk_e2e: owned.name }) });
    const absent = await total({ metadata: JSON.stringify({ sdk_e2e: `absent-${absentTrace}` }) });
    evidence.push({
      filter: 'metadata',
      baseline,
      known,
      absent,
      respected: known > 0 && absent === 0,
    });
    assert(known > 0, 'Known metadata must select the synthetic requests');
    assert.equal(absent, 0, 'Unknown metadata must not return unfiltered analytics');
    return { knownMatched: true, absent: 0 };
  });
} catch (error) {
  await harness.check('analytics-filters.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish('gateway-analytics-filters', true);
  writePrivateReport('artifacts/e2e/gateway-analytics-filter-evidence.json', {
    startedAt: harness.startedAt,
    credentialsUnchanged: true,
    mutations: false,
    evidence,
    disclosure:
      'Exact time-window controls and known/nonexistent trace or metadata filters. Counts are private tenant aggregates; public documentation must project only filter names and whether semantics were respected.',
  });
}
