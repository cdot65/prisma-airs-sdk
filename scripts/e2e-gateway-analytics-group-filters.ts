/** @internal Read-only grouped analytics discovery against historically owned traffic. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  AIGatewayClient,
  AISecSDKException,
  ErrorType,
  GroupListResponseSchema,
  UserGroupResponseSchema,
  SDK_VERSION,
} from '../src/index.js';
import { DEFAULT_AI_GW_DATA_ENDPOINT } from '../src/constants.js';
import { serializeWindow } from '../src/ai-gateway/window.js';
import { OAuthClient } from '../src/management/oauth-client.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';

const credentials = loadLiveCredentials();
const harness = new LiveHarness();
const sdk = process.argv.includes('--sdk');
const installedEntry = process.env.E2E_ANALYTICS_SDK_ENTRY;
const suite = sdk ? 'gateway-analytics-group-filters-sdk' : 'gateway-analytics-group-filters';
const evidence: {
  dimension: string;
  filter: string;
  knownPositive: boolean;
  absentEmpty: boolean;
  respected: boolean;
}[] = [];

try {
  let GatewayClient = AIGatewayClient;
  if (installedEntry) {
    assert(sdk && isAbsolute(installedEntry));
    const installed = (await import(
      pathToFileURL(installedEntry).href
    )) as typeof import('../src/index.js');
    assert.equal(installed.SDK_VERSION, SDK_VERSION);
    GatewayClient = installed.AIGatewayClient;
  }
  const original = JSON.parse(readFileSync('artifacts/e2e/gateway-observability.json', 'utf8')) as {
    startedAt: string;
    finishedAt: string;
    credentialsUnchanged: boolean;
    failed: number;
    fixtures: { resource: string; id: string; name: string }[];
  };
  assert.equal(original.credentialsUnchanged, true);
  assert.equal(original.failed, 0);
  const owned = original.fixtures.find((item) => item.resource === 'gateway.service-api-key');
  assert(owned && owned.name.startsWith('sdk-e2e-inference-'));
  const window = {
    workspaceSlug: 'ws-develo-71f8d8',
    start: new Date(Date.parse(original.startedAt) - 60_000),
    end: new Date(Date.parse(original.finishedAt) + 60_000),
  };
  const gateway = new GatewayClient({ numRetries: 0 });
  const control = await harness.check('analytics-groups.owned-positive-control', async () => {
    const page = await gateway.telemetry.logs({ ...window, pageSize: 100 });
    const record = page.data.records.find(
      (item) =>
        item.api_key_id === owned.id &&
        item.cost > 0 &&
        item.total_units > 0 &&
        item.metadataKey.some(
          (key, i) => key === 'sdk_e2e' && item.metadataValue[i] === owned.name,
        ),
    );
    assert(record && record.trace_id && record.ai_org && record.ai_model);
    assert.equal(record.workspace_slug, window.workspaceSlug);
    assert.equal(record.response_status_code, 200);
    assert(Number.isSafeInteger(record.total_units) && record.total_units > 0);
    assert(Number.isFinite(record.cost) && record.cost > 0);
    return record;
  });
  assert(control);
  const token = sdk
    ? undefined
    : await new OAuthClient({
        clientId: process.env.PANW_MGMT_CLIENT_ID!,
        clientSecret: process.env.PANW_MGMT_CLIENT_SECRET!,
        tsgId: process.env.PANW_MGMT_TSG_ID!,
      }).getToken();
  harness.protect(token);
  const params = serializeWindow(process.env.PANW_MGMT_TSG_ID!, window);
  const absentId = randomUUID();
  const fixed = { traceId: control.trace_id, metadata: JSON.stringify({ sdk_e2e: owned.name }) };
  const candidates: {
    filter: string;
    known: Record<string, string>;
    absent: Record<string, string>;
    multiple?: boolean;
  }[] = [
    { filter: 'traceId', known: { traceId: control.trace_id }, absent: { traceId: absentId } },
    {
      filter: 'metadata',
      known: { metadata: fixed.metadata },
      absent: { metadata: JSON.stringify({ sdk_e2e: `absent-${absentId}` }) },
      multiple: true,
    },
    {
      filter: 'trace-and-metadata.intersection',
      known: fixed,
      absent: { ...fixed, metadata: JSON.stringify({ sdk_e2e: `absent-${absentId}` }) },
    },
  ];
  const model = `${control.ai_org}__${control.ai_model}`;
  const absentModel = `openai__absent-${absentId}`;
  for (const [filter, known, absent] of [
    ['statusCode.single', { statusCode: '200' }, { statusCode: '418' }],
    ['statusCode.csv-or', { statusCode: '418,200' }, { statusCode: '418,419' }],
    ['apiKeyIds.single', { apiKeyIds: control.api_key_id }, { apiKeyIds: absentId }],
    [
      'apiKeyIds.csv-or',
      { apiKeyIds: `${absentId},${control.api_key_id}` },
      { apiKeyIds: `${absentId},${randomUUID()}` },
    ],
    ['aiOrgModel.single', { aiOrgModel: model }, { aiOrgModel: absentModel }],
    [
      'aiOrgModel.csv-or',
      { aiOrgModel: `${absentModel},${model}` },
      { aiOrgModel: `${absentModel},openai__another-absent-${absentId}` },
    ],
    [
      'totalUnitsMin.inclusive',
      { totalUnitsMin: String(control.total_units) },
      { totalUnitsMin: String(control.total_units + 1) },
    ],
    [
      'totalUnitsMax.inclusive',
      { totalUnitsMax: String(control.total_units) },
      { totalUnitsMax: String(control.total_units - 1) },
    ],
    ['costMin.inclusive', { costMin: String(control.cost) }, { costMin: String(control.cost * 2) }],
    ['costMax.inclusive', { costMax: String(control.cost) }, { costMax: '0' }],
    [
      'totalUnits.exact-range',
      { totalUnitsMin: String(control.total_units), totalUnitsMax: String(control.total_units) },
      { totalUnitsMin: '0', totalUnitsMax: '0' },
    ],
    [
      'cost.exact-range',
      { costMin: String(control.cost), costMax: String(control.cost) },
      { costMin: '0', costMax: '0' },
    ],
  ] as [string, Record<string, string>, Record<string, string>][]) {
    candidates.push({ filter, known: { ...fixed, ...known }, absent: { ...fixed, ...absent } });
  }
  const all = {
    ...fixed,
    statusCode: '200',
    apiKeyIds: control.api_key_id,
    aiOrgModel: model,
    totalUnitsMin: String(control.total_units),
    totalUnitsMax: String(control.total_units),
    costMin: String(control.cost),
    costMax: String(control.cost),
  };
  candidates.push({
    filter: 'all.intersection',
    known: all,
    absent: { ...all, apiKeyIds: absentId },
  });
  for (const dimension of [
    'ai_service',
    'model',
    'api_key',
    'provider',
    'status_code',
    'users',
  ] as const) {
    async function group(extra: Record<string, string>): Promise<unknown> {
      if (sdk) {
        const options = {
          ...window,
          traceId: extra.traceId,
          metadata:
            extra.metadata === undefined
              ? undefined
              : (JSON.parse(extra.metadata) as Record<string, string>),
          statusCodes: extra.statusCode?.split(',').map(Number),
          apiKeyIds: extra.apiKeyIds?.split(','),
          aiOrgModels: extra.aiOrgModel?.split(','),
          totalUnitsMin:
            extra.totalUnitsMin === undefined ? undefined : Number(extra.totalUnitsMin),
          totalUnitsMax:
            extra.totalUnitsMax === undefined ? undefined : Number(extra.totalUnitsMax),
          costMin: extra.costMin === undefined ? undefined : Number(extra.costMin),
          costMax: extra.costMax === undefined ? undefined : Number(extra.costMax),
          ...(extra.columns === undefined
            ? {}
            : { columns: ['cost', 'total_tokens'] as ('cost' | 'total_tokens')[] }),
        };
        return dimension === 'users'
          ? gateway.telemetry.byUser(options)
          : dimension === 'status_code'
            ? gateway.telemetry.byStatusCode(options)
            : gateway.telemetry.groupBy(dimension, options);
      }
      const url = new URL(`${DEFAULT_AI_GW_DATA_ENDPOINT}/logs/groups/${dimension}`);
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
          'SCM grouped analytics probe failed',
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
          assert(size <= 1_048_576, 'SCM grouped analytics response exceeds 1 MiB');
          chunks.push(item.value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    }
    async function count(extra: Record<string, string>): Promise<number> {
      const body = await group(extra);
      harness.captureResponseShape(`analytics-groups.${dimension}.${sdk ? 'sdk' : 'raw'}`, body);
      const counts =
        dimension === 'users'
          ? UserGroupResponseSchema.parse(body).data.records.map((item) => item.count)
          : GroupListResponseSchema.parse(body).data.map((item) => item.requests);
      if (dimension !== 'users' && extra.columns !== undefined) {
        const rows = GroupListResponseSchema.parse(body).data;
        assert(
          rows.every((row) => Number.isFinite(row.cost) && Number.isSafeInteger(row.total_tokens)),
        );
        if (rows.length) {
          assert.equal(rows.length, 1);
          assert.equal(rows[0].total_tokens, control!.total_units);
          assert.equal(rows[0].cost, control!.cost);
        }
      }
      assert(counts.every((value) => Number.isSafeInteger(value) && value >= 0));
      const total = counts.reduce((sum, value) => sum + value, 0);
      assert(Number.isSafeInteger(total));
      return total;
    }
    const dimensionCases =
      dimension === 'users'
        ? candidates
        : [
            ...candidates,
            {
              filter: 'all.with-columns',
              known: { ...all, columns: 'cost,total_tokens' },
              absent: { ...all, apiKeyIds: absentId, columns: 'cost,total_tokens' },
            },
          ];
    for (const candidate of dimensionCases) {
      await harness.check(`analytics-groups.${dimension}.${candidate.filter}`, async () => {
        const known = await count(candidate.known);
        const absent = await count(candidate.absent);
        const knownPositive = candidate.multiple ? known > 0 : known === 1;
        const absentEmpty = absent === 0;
        evidence.push({
          dimension,
          filter: candidate.filter,
          knownPositive,
          absentEmpty,
          respected: knownPositive && absentEmpty,
        });
        assert(
          knownPositive && absentEmpty,
          'Filter must select owned traffic and exclude absence',
        );
      });
    }
  }
} catch (error) {
  await harness.check('analytics-groups.prerequisites', async () => {
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
    sdkVersion: sdk ? SDK_VERSION : undefined,
    suite: { passed: report.passed, failed: report.failed, total: report.total },
    credentialsUnchanged: true,
    mutations: false,
    evidence,
    disclosure:
      'Read-only discovery on existing owned traffic. Every filter requires both a known positive and an empty absent cohort. No tenant identifiers, trace IDs, key IDs, metadata values or tenant counts are published. This is not full upstream analytics equivalence.',
  });
}
