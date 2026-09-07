/** @internal Read-only scalar, inclusive-range and CSV-OR contracts on owned historical traffic. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, resolve } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import {
  type AIGatewayChartFilters,
  AIGatewayClient,
  AISecSDKException,
  CostChartResponseSchema,
  CountChartResponseSchema,
  ErrorType,
  LatencyChartResponseSchema,
  SDK_VERSION,
  TokensChartResponseSchema,
} from '../src/index.js';
import { DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { serializeWindow } from '../src/ai-gateway/window.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

type Filters = Omit<AIGatewayChartFilters, 'traceId' | 'metadata'>;
type ChartData = {
  total: number | null;
  records: { y: number }[];
  p50?: number | null;
  p90?: number | null;
  p99?: number | null;
};
const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const sdk = process.argv.includes('--sdk');
const cli = process.argv.includes('--cli');
const versioned = process.argv.includes('--versioned');
const suite = cli
  ? 'gateway-analytics-query-contracts-cli'
  : sdk
    ? `gateway-analytics-query-contracts-sdk${versioned ? `-v${SDK_VERSION}` : ''}`
    : 'gateway-analytics-query-contracts';
const installedEntry = process.env.E2E_ANALYTICS_SDK_ENTRY;
const cliEntry = process.env.E2E_CLI_ENTRY;
let cliVersion: string | undefined;
const run = promisify(execFile);
async function cliCommand(args: string[]): Promise<string> {
  assert(cliEntry && isAbsolute(cliEntry));
  try {
    const result = await run(process.execPath, [cliEntry, ...args], {
      env: {
        ...process.env,
        NO_COLOR: '1',
        PANW_AI_SEC_NUM_RETRIES: '0',
        PANW_AI_SEC_TIMEOUT_MS: '20000',
      },
      timeout: 30_000,
      maxBuffer: 1_048_576,
    });
    assert(result.stdout.trim().length > 0);
    return result.stdout;
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    throw new Error(
      `CLI query-contract check failed; exit code ${typeof code === 'number' ? code : 'unknown'}`,
    );
  }
}
const evidence: {
  metric: string;
  filter: string;
  knownPositive: boolean;
  absentEmpty: boolean;
  absentAggregate: number | null;
  respected: boolean;
}[] = [];
try {
  assert(!(sdk && cli), 'Choose one consumer mode');
  assert(!versioned || (sdk && !cli), 'Versioned report names require SDK consumer mode');
  if (cli) {
    assert(cliEntry && isAbsolute(cliEntry) && !installedEntry);
    const packageFile = resolve(dirname(cliEntry), '../../package.json');
    const pkg = JSON.parse(readFileSync(packageFile, 'utf8')) as {
      version: string;
      dependencies: Record<string, string>;
    };
    assert.equal(pkg.version, '4.3.1');
    assert.equal(pkg.dependencies['@cdot65/prisma-airs-sdk'], SDK_VERSION);
    assert.equal(createRequire(packageFile)('@cdot65/prisma-airs-sdk').SDK_VERSION, SDK_VERSION);
    cliVersion = pkg.version;
    await harness.check('analytics-query.installed-cli-version', async () => {
      assert.equal((await cliCommand(['--version'])).trim(), cliVersion);
    });
  }
  let GatewayClient = AIGatewayClient;
  if (installedEntry) {
    assert(sdk && isAbsolute(installedEntry));
    const installed = (await import(
      pathToFileURL(installedEntry).href
    )) as typeof import('../src/index.js');
    assert.equal(installed.SDK_VERSION, SDK_VERSION);
    GatewayClient = installed.AIGatewayClient;
  }
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
  const owned = original.fixtures.find((f) => f.resource === 'gateway.service-api-key');
  assert(owned && owned.name.startsWith('sdk-e2e-inference-'));
  const window = {
    workspaceSlug: 'ws-develo-71f8d8',
    start: new Date(Date.parse(original.startedAt) - 60_000),
    end: new Date(Date.parse(original.finishedAt) + 60_000),
  };
  const control = await harness.check('analytics-query.owned-positive-control', async () => {
    const page = await gateway.telemetry.logs({ ...window, pageSize: 100 });
    const record = page.data.records.find(
      (r) =>
        r.api_key_id === owned.id &&
        r.cost > 0 &&
        r.total_units > 0 &&
        r.metadataKey.some((k, i) => k === 'sdk_e2e' && r.metadataValue[i] === owned.name),
    );
    assert(record && record.trace_id && record.ai_org && record.ai_model);
    assert.equal(record.workspace_slug, window.workspaceSlug);
    assert.equal(record.response_status_code, 200);
    assert(Number.isSafeInteger(record.total_units) && record.total_units > 0);
    assert(Number.isFinite(record.cost) && record.cost > 0);
    return record;
  });
  assert(control);
  const token =
    sdk || cli
      ? undefined
      : await new OAuthClient({
          clientId: process.env.PANW_MGMT_CLIENT_ID!,
          clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
          tsgId: process.env.PANW_MGMT_TSG_ID!,
        }).getToken();
  harness.protect(token);
  const params = serializeWindow(process.env.PANW_MGMT_TSG_ID!, window);
  const missingKey = randomUUID();
  const missingModel = `openai__absent-${randomUUID()}`;
  const knownModel = `${control.ai_org}__${control.ai_model}`;
  const cases: { filter: string; known: Filters; absent: Filters }[] = [
    { filter: 'statusCodes.single', known: { statusCodes: [200] }, absent: { statusCodes: [418] } },
    {
      filter: 'statusCodes.csv-or',
      known: { statusCodes: [418, 200] },
      absent: { statusCodes: [418, 419] },
    },
    {
      filter: 'apiKeyIds.single',
      known: { apiKeyIds: [control.api_key_id] },
      absent: { apiKeyIds: [missingKey] },
    },
    {
      filter: 'apiKeyIds.csv-or',
      known: { apiKeyIds: [missingKey, control.api_key_id] },
      absent: { apiKeyIds: [missingKey, randomUUID()] },
    },
    {
      filter: 'aiOrgModels.single',
      known: { aiOrgModels: [knownModel] },
      absent: { aiOrgModels: [missingModel] },
    },
    {
      filter: 'aiOrgModels.csv-or',
      known: { aiOrgModels: [missingModel, knownModel] },
      absent: { aiOrgModels: [missingModel, `openai__absent-${randomUUID()}`] },
    },
    {
      filter: 'totalUnitsMin.inclusive',
      known: { totalUnitsMin: control.total_units },
      absent: { totalUnitsMin: control.total_units + 1 },
    },
    {
      filter: 'totalUnitsMax.inclusive',
      known: { totalUnitsMax: control.total_units },
      absent: { totalUnitsMax: control.total_units - 1 },
    },
    {
      filter: 'costMin.inclusive',
      known: { costMin: control.cost },
      absent: { costMin: control.cost * 2 },
    },
    { filter: 'costMax.inclusive', known: { costMax: control.cost }, absent: { costMax: 0 } },
    {
      filter: 'totalUnits.exact-range',
      known: { totalUnitsMin: control.total_units, totalUnitsMax: control.total_units },
      absent: { totalUnitsMin: 0, totalUnitsMax: 0 },
    },
    {
      filter: 'cost.exact-range',
      known: { costMin: control.cost, costMax: control.cost },
      absent: { costMin: 0, costMax: 0 },
    },
  ];
  const all: Filters = {
    statusCodes: [200],
    apiKeyIds: [control.api_key_id],
    aiOrgModels: [knownModel],
    totalUnitsMin: control.total_units,
    totalUnitsMax: control.total_units,
    costMin: control.cost,
    costMax: control.cost,
  };
  cases.push({
    filter: 'all.intersection',
    known: all,
    absent: { ...all, apiKeyIds: [missingKey] },
  });

  for (const [metric, schema] of [
    ['requests', CountChartResponseSchema],
    ['cost', CostChartResponseSchema],
    ['tokens', TokensChartResponseSchema],
    ['latency', LatencyChartResponseSchema],
  ] as const) {
    async function chart(filters: Filters): Promise<ChartData> {
      if (cli) {
        const args = [
          'aigateway',
          'telemetry',
          metric,
          '--workspace',
          window.workspaceSlug,
          '--output',
          'json',
          '--trace-id',
          control!.trace_id,
          '--metadata',
          JSON.stringify({ sdk_e2e: owned!.name }),
        ];
        // Cost preserves its existing rolling-window interface. The unique historical trace
        // stays inside seven days; the other charts use the original exact fixture window.
        if (metric === 'cost') args.push('--days', '7');
        else args.push('--start', window.start.toISOString(), '--end', window.end.toISOString());
        for (const [key, value] of Object.entries(filters)) {
          const flag = '--' + key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
          args.push(flag, Array.isArray(value) ? value.join(',') : String(value));
        }
        const parsed = JSON.parse(await cliCommand(args));
        harness.captureResponseShape(`analytics-query.${metric}.cli`, parsed);
        if (metric !== 'cost') return schema.parse(parsed).data;
        assert.equal(parsed.workspaceSlug, window.workspaceSlug);
        assert.equal(parsed.days, 7);
        assert.equal(parsed.totalUsd, parsed.totalCents / 100);
        assert.equal(parsed.avgUsd, parsed.avgCents / 100);
        assert(
          parsed.records.every(
            (r: { costUsd: number; costCents: number }) => r.costUsd === r.costCents / 100,
          ),
        );
        return CostChartResponseSchema.parse({
          success: true,
          data: {
            total: parsed.totalCents,
            avg: parsed.avgCents,
            isQuotaExceeded: parsed.quotaExceeded,
            records: parsed.records.map((r: { date: string; costCents: number }) => ({
              x: r.date,
              y: r.costCents,
            })),
          },
        }).data;
      }
      if (sdk) {
        const result = await gateway.telemetry[metric]({
          ...window,
          traceId: control!.trace_id,
          metadata: { sdk_e2e: owned!.name },
          ...filters,
        });
        harness.captureResponseShape(`analytics-query.${metric}.sdk`, result);
        return result.data;
      }
      const url = new URL(DEFAULT_AI_GW_DATA_ENDPOINT + `/logs/charts/${metric}`);
      for (const [key, value] of Object.entries({
        ...params,
        traceId: control!.trace_id,
        metadata: JSON.stringify({ sdk_e2e: owned!.name }),
      }))
        url.searchParams.set(key, value);
      for (const [key, value] of Object.entries(filters)) {
        const wireKey =
          key === 'statusCodes' ? 'statusCode' : key === 'aiOrgModels' ? 'aiOrgModel' : key;
        url.searchParams.set(wireKey, Array.isArray(value) ? value.join(',') : String(value));
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, 'x-tsg-id': process.env.PANW_MGMT_TSG_ID! },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new AISecSDKException(
          'SCM query-contract probe failed',
          response.status >= 500 ? ErrorType.SERVER_SIDE_ERROR : ErrorType.CLIENT_SIDE_ERROR,
          { statusCode: response.status },
        );
      }
      assert(response.body);
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const item = await reader.read();
          if (item.done) break;
          size += item.value.byteLength;
          assert(size <= 1_048_576);
          chunks.push(item.value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      harness.captureResponseShape(`analytics-query.${metric}.raw`, body);
      return schema.parse(body).data;
    }
    for (const candidate of cases) {
      await harness.check(`analytics-query.${metric}.${candidate.filter}`, async () => {
        const known = await chart(candidate.known);
        const absent = await chart(candidate.absent);
        const knownPositive =
          typeof known.total === 'number' && known.total > 0 && known.records.some((r) => r.y > 0);
        const absentEmpty =
          (metric === 'latency'
            ? absent.total === null &&
              absent.p50 === null &&
              absent.p90 === null &&
              absent.p99 === null
            : absent.total === 0) && absent.records.every((r) => r.y === 0);
        evidence.push({
          metric,
          filter: candidate.filter,
          knownPositive,
          absentEmpty,
          absentAggregate: absent.total,
          respected: knownPositive && absentEmpty,
        });
        assert(knownPositive && absentEmpty);
        if (metric === 'requests') assert.equal(known.total, 1);
      });
    }
  }
} catch (error) {
  await harness.check('analytics-query.prerequisites', async () => {
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
    mode: cli
      ? 'installed-cli'
      : sdk
        ? installedEntry
          ? 'installed-sdk'
          : 'source-sdk'
        : 'raw-scm',
    cliVersion,
    sdkVersion: sdk || cli ? SDK_VERSION : undefined,
    suite: { passed: report.passed, failed: report.failed, total: report.total },
    credentialsUnchanged: true,
    mutations: false,
    evidence,
    disclosure:
      'Existing owned positive traffic only. Inclusive bounds, singleton/CSV-OR alternatives and combined filters are checked on each chart with an empty negative cohort. No trace IDs, keys, metadata values or tenant counts are published. This does not establish full upstream analytics equivalence.',
  });
}
