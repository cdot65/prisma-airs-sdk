/** Read-only dashboard feasibility. Never prints tokens, app IDs, session IDs, or raw bodies. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  ManagementClient,
  DashboardApplicationsOverviewSchema,
  DashboardApplicationSchema,
  DashboardApplicationViolationBreakdownSchema,
  DashboardTopApplicationsViolationsSchema,
  DashboardApplicationsViolationsTrendSchema,
} from '../src/index.js';

const configPath = join(homedir(), '.prisma-airs', 'config.json');
const before = readFileSync(configPath);
const config = JSON.parse(before.toString('utf8')) as Record<string, unknown>;
const required = (name: string): string => {
  const value = config[name];
  assert(typeof value === 'string' && value.trim(), `Missing configuration field: ${name}`);
  return value;
};
process.env.PANW_AI_SEC_DEBUG = 'false';
process.env.PANW_AI_SEC_DEBUG_BODY = 'false';
process.env.PANW_AI_SEC_TIMEOUT_MS = '20000';
const endpoint = 'https://api.apps.paloaltonetworks.com/aisec';
const tenant = required('mgmtTsgId');
const originalFetch = globalThis.fetch;
const traffic: Array<Record<string, unknown>> = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const response = await originalFetch(input, init);
  if (url.pathname.endsWith('/access_token')) {
    const form = new URLSearchParams(typeof init?.body === 'string' ? init.body : '');
    traffic.push({
      operation: 'oauth',
      status: response.status,
      clientCredentials: form.get('grant_type') === 'client_credentials',
      tenantScoped: form.get('scope') === `tsg_id:${tenant}`,
    });
  } else if (url.pathname.includes('/dashboard/v2/apps/')) {
    const headers = new Headers(init?.headers);
    traffic.push({
      operation: url.pathname.split('/').at(-1),
      status: response.status,
      host: url.hostname,
      method: init?.method,
      oauthBearer: headers.get('authorization')?.startsWith('Bearer ') ?? false,
      tenantHeader: headers.get('x-tsg-id') === tenant,
      browserHeaders: headers.has('origin') || headers.has('referer') || headers.has('cookie'),
      responseBytes: Buffer.byteLength(await response.clone().text()),
    });
  }
  return response;
};

try {
  const mgmt = new ManagementClient({
    clientId: required('mgmtClientId'),
    clientSecret: required('mgmtClientSecret'),
    tsgId: tenant,
    dashboardEndpoint: endpoint,
    tokenEndpoint:
      typeof config.mgmtTokenEndpoint === 'string' ? config.mgmtTokenEndpoint : undefined,
    numRetries: 0,
  });
  const daily = { timeInterval: 1, timeUnit: 'day' } as const;
  // Match discovery to the detail window: a valid 30-day application can age out of one day.
  const discovery = { timeInterval: 30, timeUnit: 'days' } as const;
  const rawOverview = await mgmt.dashboard.applicationsOverviewRaw({
    ...discovery,
    limit: 25,
    offset: 0,
  });
  const overview = DashboardApplicationsOverviewSchema.parse(rawOverview);
  assert.deepEqual(overview, rawOverview);
  const targetName = process.argv[2] ?? 'AI-Security-Academy';
  let app = overview.items.find((item) => item.name === targetName);
  // Resolve the supplied display name from the dashboard rather than persisting tenant UUIDs.
  for (
    let offset = 25;
    !app && offset < (overview.pagination?.total_items ?? 0) && offset < 500;
    offset += 25
  ) {
    const page = await mgmt.dashboard.applicationsOverview({ ...discovery, limit: 25, offset });
    app = page.items.find((item) => item.name === targetName);
  }
  assert(app?.id && app.name, 'Requested application is not in the 30-day dashboard inventory');
  const appQuery = {
    appId: app.id,
    appName: app.name,
    timeInterval: 30,
    timeUnit: 'days',
  } as const;
  const application = await mgmt.dashboard.applicationRaw(appQuery);
  const breakdown = await mgmt.dashboard.applicationViolationBreakdownRaw(appQuery);
  const top = await mgmt.dashboard.topApplicationsViolationsRaw(daily);
  const trend = await mgmt.dashboard.applicationsViolationsTrendRaw(daily);
  for (const [operation, body] of Object.entries({ application, breakdown, top, trend })) {
    assert(
      body && typeof body === 'object' && !Array.isArray(body),
      `Missing ${operation} JSON object`,
    );
    console.log(JSON.stringify({ stage: 'raw', operation, fields: Object.keys(body) }));
  }
  const parsedApp = DashboardApplicationSchema.parse(application);
  const parsedBreakdown = DashboardApplicationViolationBreakdownSchema.parse(breakdown);
  const parsedTop = DashboardTopApplicationsViolationsSchema.parse(top);
  const parsedTrend = DashboardApplicationsViolationsTrendSchema.parse(trend);
  for (const [parsed, raw] of [
    [parsedApp, application],
    [parsedBreakdown, breakdown],
    [parsedTop, top],
    [parsedTrend, trend],
  ]) {
    assert.deepEqual(parsed, raw, 'Zod discarded or transformed a live field');
  }
  const typedOverview = await mgmt.dashboard.applicationsOverview({
    ...daily,
    limit: 25,
    offset: 0,
  });
  const typedApp = await mgmt.dashboard.application(appQuery);
  const typedBreakdown = await mgmt.dashboard.applicationViolationBreakdown(appQuery);
  const typedTop = await mgmt.dashboard.topApplicationsViolations(daily);
  const typedTrend = await mgmt.dashboard.applicationsViolationsTrend(daily);
  assert.equal(typedApp.id, appQuery.appId);
  assert.equal(typedApp.name, appQuery.appName);
  assert(typedApp.session_stats && typedApp.token_stats, 'Missing typed application statistics');
  assert(
    Array.isArray(typedOverview.items) &&
      Array.isArray(typedBreakdown.detection_type_violation_breakdown),
  );
  assert(Array.isArray(typedTop.applications) && Array.isArray(typedTrend.violations));
  const auth = traffic.filter((row) => row.operation === 'oauth');
  const reads = traffic.filter((row) => row.operation !== 'oauth');
  assert.equal(auth.length, 1, 'Expected a single freshly acquired token reused by all methods');
  assert(auth.every((row) => row.status === 200 && row.clientCredentials && row.tenantScoped));
  assert(
    reads.every(
      (row) =>
        row.status === 200 &&
        row.host === 'api.apps.paloaltonetworks.com' &&
        row.method === 'GET' &&
        row.oauthBearer &&
        row.tenantHeader &&
        !row.browserHeaders &&
        Number(row.responseBytes) > 0,
    ),
  );
  console.log(
    JSON.stringify({
      stage: 'validated',
      capturedAt: new Date().toISOString(),
      rawModelsLossless: true,
      typedMethodsPassed: 5,
      dailyOverviewItems: typedOverview.items.length,
      application: {
        name: parsedApp.name,
        windowDays: 30,
        sessions: parsedApp.session_stats?.total,
        violatingSessions: parsedApp.session_stats?.violating,
        hasWebhookSignature: parsedApp.has_webhook_sig,
        tokenStats: parsedApp.token_stats,
      },
      detectorBreakdown: {
        windowDays: 30,
        totalViolations: parsedBreakdown.total_violating,
        detectors: parsedBreakdown.detection_type_violation_breakdown.map((row) => ({
          detector: row.detection_type,
          count: row.violation_breakdown?.total,
        })),
      },
      topApplications: {
        windowDays: 1,
        returned: parsedTop.applications.length,
        applications: parsedTop.applications.map((row) => ({
          name: row.name,
          violations: row.total_violations,
        })),
      },
      trend: {
        windowDays: 1,
        buckets: parsedTrend.violations.length,
        sumOfBucketViolations: parsedTrend.violations.reduce(
          (sum, bucket) => sum + (bucket.violation_breakdown.total ?? 0),
          0,
        ),
      },
      traffic,
    }),
  );
} catch (error) {
  const value = error as { errorType?: string; name?: string; statusCode?: number };
  console.error(
    JSON.stringify({
      stage: 'failed',
      errorType: value.errorType ?? value.name,
      statusCode: value.statusCode,
      traffic,
    }),
  );
  process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  const configUnchanged = before.equals(readFileSync(configPath));
  console.log(JSON.stringify({ configUnchanged }));
  if (!configUnchanged) process.exitCode = 1;
}
