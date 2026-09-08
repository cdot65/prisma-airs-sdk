/** @internal Read-only SDK verification of the user's SCM dashboard captures. No raw output. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import * as sdk from '../src/index.js';
import type { AIGatewayWindowOptions, GatewayLogsResponse } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness, writePrivateReport } from './e2e/harness.js';
import { readGatewayCapture } from './e2e/gateway-capture.js';

const input = process.env.GATEWAY_DASHBOARD_CAPTURE ?? '/var/tmp/t2.txt';
const digest = () => createHash('sha256').update(readFileSync(input)).digest('hex');
const original = digest();
const captures = readGatewayCapture(input);
const fixturesOnly = process.argv.includes('--fixtures-only');
const built = process.argv.includes('--built');
const GatewayClient = built
  ? (await import('../dist/index.js')).AIGatewayClient
  : sdk.AIGatewayClient;
const credentials = fixturesOnly ? undefined : loadLiveCredentials();
delete process.env.E2E_DIAGNOSTICS;
process.env.PANW_AI_SEC_TIMEOUT_MS = '15000';
const harness = new LiveHarness();
const client = fixturesOnly
  ? undefined
  : new GatewayClient({
      dataEndpoint: 'https://api.apps.paloaltonetworks.com/ai_gw/v2',
      adminEndpoint: 'https://api.apps.paloaltonetworks.com/ai_gw/admin/v2',
      numRetries: 0,
    });
const charts = {
  'cache-hit-trend': ['cacheHitTrend', sdk.CacheHitTrendResponseSchema],
  'cache-summary': ['cacheSummary', sdk.CacheSummaryResponseSchema],
  cost: ['cost', sdk.CostChartResponseSchema],
  'error-category-trends': ['errorCategoryTrends', sdk.ErrorCategoryTrendsResponseSchema],
  'error-trends': ['errorTrends', sdk.ErrorTrendsResponseSchema],
  errors: ['errors', sdk.CountChartResponseSchema],
  'feedback-models': ['feedbackModels', sdk.FeedbackModelsResponseSchema],
  'feedback-score-distribution': [
    'feedbackScoreDistribution',
    sdk.FeedbackScoreDistributionResponseSchema,
  ],
  'feedback-trend': ['feedbackTrend', sdk.CountChartResponseSchema],
  'feedback-weighted': ['feedbackWeighted', sdk.CountChartResponseSchema],
  'grouped-errors': ['groupedErrors', sdk.GroupedErrorsResponseSchema],
  latency: ['latency', sdk.LatencyChartResponseSchema],
  requests: ['requests', sdk.CountChartResponseSchema],
  'rescued-retries': ['rescuedRetries', sdk.RescuedRetriesResponseSchema],
  tokens: ['tokens', sdk.TokensChartResponseSchema],
  'user-trends': ['userTrends', sdk.UserTrendsResponseSchema],
  users: ['users', sdk.CountChartResponseSchema],
} as const;
const schemas: Record<string, z.ZodTypeAny> = {
  '/ai_gw/v2/configs': sdk.ListConfigsResponseSchema,
  '/ai_gw/v2/api-keys/service': sdk.ListApiKeysResponseSchema,
  '/ai_gw/v2/api-keys/user': sdk.ListApiKeysResponseSchema,
  '/ai_gw/admin/v2/workspaces': sdk.ListWorkspacesResponseSchema,
  '/ai_gw/admin/v2/utils/static-resources/schema': sdk.GatewayGuardrailCatalogResponseSchema,
  '/ai_gw/v2/analytics/filter-boundaries': sdk.GatewayFilterBoundariesResponseSchema,
  '/ai_gw/v2/logs': sdk.GatewayLogsResponseSchema,
};
function window(url: URL): AIGatewayWindowOptions {
  return {
    workspaceSlug: url.searchParams.get('workspaceSlug') ?? '',
    start: new Date(url.searchParams.get('timeOfGenerationMin') ?? ''),
    end: new Date(url.searchParams.get('timeOfGenerationMax') ?? ''),
  };
}
// Deliberately allowlist aggregates. Do not retain metadata, keys, URLs, configs or log rows.
function project(response: unknown): Record<string, unknown> {
  const root = response as Record<string, unknown>;
  const data =
    root.data && !Array.isArray(root.data) ? (root.data as Record<string, unknown>) : root;
  const result: Record<string, unknown> = {};
  for (const key of ['total', 'avg', 'p50', 'p90', 'p99', 'isQuotaExceeded', 'capturedTotal']) {
    if (typeof data[key] === 'number' || typeof data[key] === 'boolean' || data[key] === null)
      result[key] = data[key];
  }
  for (const key of [
    'records',
    'trend',
    'data',
    'evals',
    'unique_ai_models',
    'unique_status_codes',
  ]) {
    if (Array.isArray(data[key])) result[`${key}Count`] = data[key].length;
  }
  if (root.benefits) result.organisationInfoPresent = true;
  return result;
}
const observations: Record<string, unknown> = {};
try {
  assert.equal(captures.length, 25, 'Expected all 25 supplied requests');
  for (const { url, response } of captures) {
    const name = url.pathname.replace(/\/organisations\/\d+\//, '/organisations/<tsg>/');
    await harness.check(name, async () => {
      const slug = url.pathname.split('/').at(-1)!;
      const chart = url.pathname.includes('/logs/charts/')
        ? charts[slug as keyof typeof charts]
        : undefined;
      const schema =
        chart?.[1] ?? (name.endsWith('/info') ? sdk.GatewayOrganisationInfoSchema : schemas[name]);
      assert(schema, 'Unmapped supplied request');
      const fixture = schema.safeParse(response);
      if (!fixture.success) {
        console.log(
          JSON.stringify({
            name,
            fixtureIssues: fixture.error.issues.map((i) => ({ path: i.path, code: i.code })),
          }),
        );
        throw new Error('Captured response does not match schema');
      }
      if (!client) return { fixtureValidated: true };
      const scope = { workspaceId: url.searchParams.get('workspace_id') ?? '' };
      let live: unknown;
      if (chart) live = await client.telemetry[chart[0]](window(url));
      else
        switch (name) {
          case '/ai_gw/v2/configs':
            live = await client.configs.list(scope);
            break;
          case '/ai_gw/v2/api-keys/service':
            live = await client.apiKeys.listService(scope);
            break;
          case '/ai_gw/v2/api-keys/user':
            live = await client.apiKeys.listUser(scope);
            break;
          case '/ai_gw/admin/v2/workspaces':
            live = await client.workspaces.list({ plane: 'admin' });
            break;
          case '/ai_gw/admin/v2/organisations/<tsg>/info':
            live = await client.organisations.getInfo(process.env.PANW_MGMT_TSG_ID!);
            break;
          case '/ai_gw/admin/v2/utils/static-resources/schema':
            live = await client.guardrails.getCatalog();
            break;
          case '/ai_gw/v2/analytics/filter-boundaries':
            live = await client.telemetry.filterBoundaries(window(url));
            break;
          case '/ai_gw/v2/logs':
            live = await client.telemetry.logs({ ...window(url), pageSize: 50, currentPage: 0 });
            break;
          default:
            throw new Error('Unmapped supplied request');
        }
      if (live && typeof live === 'object' && 'success' in live) assert.equal(live.success, true);
      const summary = project(live);
      observations[name] = summary;
      console.log(JSON.stringify({ name, summary }));
      return summary;
    });
  }
  if (client) {
    const capturedLogs = captures.find((c) => c.url.pathname === '/ai_gw/v2/logs');
    assert(capturedLogs);
    await harness.check('logs.complete-pagination', async () => {
      const ids = new Set<string>();
      let total: number | undefined;
      for (let currentPage = 0; currentPage < 20; currentPage++) {
        const page: GatewayLogsResponse = await client.telemetry.logs({
          ...window(capturedLogs.url),
          pageSize: 50,
          currentPage,
        });
        assert.equal(page.success, true);
        assert.equal(page.data.isQuotaExceeded, false);
        assert(Number.isSafeInteger(page.data.total) && page.data.total >= 0);
        total ??= page.data.total;
        assert.equal(page.data.total, total, 'Window total changed during pagination');
        assert(page.data.records.length <= 50);
        for (const row of page.data.records) {
          assert(!ids.has(row.id), 'Duplicate log identity across pages');
          ids.add(row.id);
        }
        assert(ids.size <= total);
        if (ids.size === total) {
          const beyond = await client.telemetry.logs({
            ...window(capturedLogs.url),
            pageSize: 50,
            currentPage: currentPage + 1,
          });
          assert.equal(beyond.data.records.length, 0, 'Past-end page must be empty');
          const result = {
            pages: currentPage + 1,
            returned: ids.size,
            total,
            complete: true,
            pastEndEmpty: true,
          };
          observations.pagination = result;
          console.log(JSON.stringify(result));
          return result;
        }
        assert(page.data.records.length > 0, 'Premature empty page');
      }
      throw new Error('Exceeded 20-page verification budget');
    });
    await harness.check('filter-boundaries.empty-window', async () => {
      const result = await client.telemetry.filterBoundaries({
        workspaceSlug: window(capturedLogs.url).workspaceSlug,
        start: new Date('2000-01-01T00:00:00Z'),
        end: new Date('2000-01-01T01:00:00Z'),
      });
      assert.equal(result.success, true);
      assert.equal(result.data.isQuotaExceeded, false);
      assert.equal(result.data.unique_ai_models.length, 0);
      assert.equal(result.data.unique_status_codes.length, 0);
      for (const key of ['total_units_min', 'total_units_max', 'cost_min', 'cost_max'] as const) {
        assert(result.data[key] === null || result.data[key] === 0);
      }
      observations.emptyBoundaries = project(result);
      return project(result);
    });
  }
} finally {
  credentials?.verifyUnchanged();
  assert.equal(digest(), original, 'Read-only capture changed');
  writePrivateReport(
    `artifacts/e2e/gateway-dashboard-inputs${fixturesOnly ? '-fixtures' : ''}.json`,
    {
      startedAt: harness.startedAt,
      finishedAt: new Date().toISOString(),
      credentialsUnchanged: true,
      captureUnchanged: true,
      mutations: false,
      rawResponsesRetained: false,
      fixturesOnly,
      built,
      observations,
      results: harness.results,
    },
  );
  await harness.finish(`gateway-dashboard-inputs${fixturesOnly ? '-fixtures' : ''}-checks`, true);
}
