/** @internal Read-only SCM chart filters: require positive owned and empty absent cohorts. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import {
  AIGatewayClient,
  AISecSDKException,
  ErrorType,
  CostChartResponseSchema,
  CountChartResponseSchema,
  LatencyChartResponseSchema,
  TokensChartResponseSchema,
  SDK_VERSION,
} from '../src/index.js';
import { DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { serializeWindow } from '../src/ai-gateway/window.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const sdk = process.argv.includes('--sdk');
const suite = sdk ? 'gateway-analytics-chart-filters-sdk' : 'gateway-analytics-chart-filters';
const installedEntry = process.env.E2E_ANALYTICS_SDK_ENTRY;
let testedVersion: string | undefined;
type Metric = 'requests' | 'cost' | 'tokens' | 'latency';
type ChartData = {
  total: number | null;
  records: { y: number }[];
  p50?: number | null;
  p90?: number | null;
  p99?: number | null;
};
let controlEvidence: Record<string, boolean> = {};
const evidence: {
  metric: string;
  filter: string;
  knownPositive: boolean;
  absentEmpty: boolean;
  absentAggregate: number | null;
  respected: boolean;
}[] = [];
try {
  let GatewayClient = AIGatewayClient;
  if (installedEntry) {
    assert(
      sdk && isAbsolute(installedEntry),
      'Installed analytics entry requires --sdk and an absolute local path',
    );
    const installed = (await import(
      pathToFileURL(installedEntry).href
    )) as typeof import('../src/index.js');
    assert.equal(
      installed.SDK_VERSION,
      SDK_VERSION,
      'Installed SDK must match the release under verification',
    );
    GatewayClient = installed.AIGatewayClient;
  }
  if (sdk) testedVersion = SDK_VERSION;
  const gateway = new GatewayClient({ numRetries: 0 });
  const original = JSON.parse(readFileSync('artifacts/e2e/gateway-observability.json', 'utf8')) as {
    startedAt: string;
    finishedAt: string;
    credentialsUnchanged: boolean;
    failed: number;
    fixtures: { resource: string; id: string; name: string }[];
  };
  assert.equal(original.credentialsUnchanged, true);
  assert.equal(original.failed, 0);
  const owned = original.fixtures.find((fixture) => fixture.resource === 'gateway.service-api-key');
  assert(owned && owned.name.startsWith('sdk-e2e-inference-'));
  // A fixed historical window avoids unrelated new traffic and expiry of a rolling-day control.
  const window = {
    workspaceSlug: 'ws-develo-71f8d8',
    start: new Date(Date.parse(original.startedAt) - 60_000),
    end: new Date(Date.parse(original.finishedAt) + 60_000),
  };
  const control = await harness.check('analytics-chart-filters.owned-log-control', async () => {
    const page = await gateway.telemetry.logs({ ...window, pageSize: 100 });
    const record = page.data.records.find(
      (item) =>
        item.api_key_id === owned.id &&
        item.total_units > 0 &&
        item.cost > 0 &&
        item.metadataKey.some(
          (key, index) => key === 'sdk_e2e' && item.metadataValue[index] === owned.name,
        ),
    );
    controlEvidence = {
      found: !!record,
      positiveTokens: !!record && record.total_units > 0,
      positiveCost: !!record && record.cost > 0,
      matchingMetadata:
        !!record &&
        record.metadataKey.some(
          (key, index) => key === 'sdk_e2e' && record.metadataValue[index] === owned.name,
        ),
    };
    assert(record && record.total_units > 0 && record.cost > 0);
    assert(
      record.metadataKey.some(
        (key, index) => key === 'sdk_e2e' && record.metadataValue[index] === owned.name,
      ),
    );
    assert(record.trace_id.length > 0);
    return record.trace_id;
  });
  assert(control, 'A positive-cost, token-bearing owned log is required');
  const token = sdk
    ? undefined
    : await new OAuthClient({
        clientId: process.env.PANW_MGMT_CLIENT_ID!,
        clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
        tsgId: process.env.PANW_MGMT_TSG_ID!,
      }).getToken();
  harness.protect(token);
  const params = serializeWindow(process.env.PANW_MGMT_TSG_ID!, window);
  async function chart(
    metric: Metric,
    extra: Record<string, string>,
    schema: z.ZodTypeAny,
  ): Promise<ChartData> {
    if (sdk) {
      const result = await gateway.telemetry[metric]({
        ...window,
        traceId: extra.traceId,
        metadata:
          extra.metadata === undefined
            ? undefined
            : (JSON.parse(extra.metadata) as Record<string, string>),
      });
      harness.captureResponseShape(`analytics-chart-filters.${metric}.sdk`, result);
      return result.data;
    }
    const url = new URL(DEFAULT_AI_GW_DATA_ENDPOINT + `/logs/charts/${metric}`);
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
        'SCM chart probe failed',
        response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
        {
          statusCode: response.status,
        },
      );
    }
    assert(response.body);
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        assert(size <= 1024 * 1024, 'SCM chart response exceeds 1 MiB');
        chunks.push(chunk.value);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    harness.captureResponseShape(`analytics-chart-filters.${metric}.raw`, parsed);
    const result = schema.parse(parsed) as { data: ChartData };
    return result.data;
  }
  function empty(metric: Metric, data: ChartData): boolean {
    return (
      (metric === 'latency'
        ? data.total === null && data.p50 === null && data.p90 === null && data.p99 === null
        : data.total === 0) && data.records.every((record) => record.y === 0)
    );
  }
  const absentTrace = randomUUID();
  for (const [metric, schema] of [
    ['requests', CountChartResponseSchema],
    ['cost', CostChartResponseSchema],
    ['tokens', TokensChartResponseSchema],
    ['latency', LatencyChartResponseSchema],
  ] as const) {
    for (const filter of ['traceId', 'metadata', 'combined'] as const) {
      await harness.check(
        `analytics-chart-filters.${metric}.${filter}.known-and-absent`,
        async () => {
          const knownValue =
            filter === 'traceId' ? control : JSON.stringify({ sdk_e2e: owned.name });
          const absentValue =
            filter === 'traceId'
              ? absentTrace
              : JSON.stringify({ sdk_e2e: `absent-${absentTrace}` });
          const known = await chart(
            metric,
            filter === 'combined'
              ? { traceId: control, metadata: knownValue }
              : { [filter]: knownValue },
            schema,
          );
          const absent = await chart(
            metric,
            filter === 'combined'
              ? { traceId: control, metadata: absentValue }
              : { [filter]: absentValue },
            schema,
          );
          const knownPositive =
            typeof known.total === 'number' &&
            Number.isFinite(known.total) &&
            known.total > 0 &&
            known.records.some((record) => record.y > 0);
          const absentEmpty = empty(metric, absent);
          evidence.push({
            metric,
            filter,
            knownPositive,
            absentEmpty,
            absentAggregate: absent.total,
            respected: knownPositive && absentEmpty,
          });
          assert(knownPositive, 'Owned cohort must produce positive aggregate and bucket values');
          assert(absentEmpty, 'Nonexistent cohort must not return unfiltered values');
          if (metric === 'requests' && filter === 'traceId') assert.equal(known.total, 1);
        },
      );
    }
  }
} catch (error) {
  await harness.check('analytics-chart-filters.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  harness.finish(suite, true);
  const report = JSON.parse(readFileSync(`artifacts/e2e/${suite}.json`, 'utf8')) as {
    finishedAt: string;
    passed: number;
    failed: number;
    total: number;
  };
  writePrivateReport(`artifacts/examples/${suite}.json`, {
    capturedAt: report.finishedAt,
    mode: sdk ? (installedEntry ? 'installed-sdk' : 'source-sdk') : 'raw-scm',
    sdkVersion: testedVersion,
    suite: { passed: report.passed, failed: report.failed, total: report.total },
    credentialsUnchanged: true,
    mutations: false,
    control: controlEvidence,
    evidence,
    disclosure:
      'Read-only checks of existing owned traffic. Positive/empty cohort booleans and actual absent aggregate zero/null are retained, not tenant counts, trace IDs, metadata values or tokens. Combined filters match a known trace and known metadata, then require an empty result for the same known trace with nonexistent metadata. These do not establish upstream operation equivalence.',
  });
}
