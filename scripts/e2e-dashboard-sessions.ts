/** Read-only session drill-down. No live identifiers, user attributes, or scan text are printed. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  ManagementClient,
  DashboardAppsListSchema,
  DashboardSessionsChartSchema,
  DashboardSessionsOverviewSchema,
  DashboardSessionSchema,
  DashboardSessionTransactionSchema,
  DashboardScanContentSchema,
} from '../src/index.js';

const configPath = join(homedir(), '.prisma-airs', 'config.json');
const original = readFileSync(configPath);
const config = JSON.parse(original.toString('utf8')) as Record<string, unknown>;
const credential = (key: string): string => {
  const value = config[key];
  assert(typeof value === 'string' && value.trim(), `Missing config field: ${key}`);
  return value;
};
const tenant = credential('mgmtTsgId');
process.env.PANW_AI_SEC_DEBUG = 'false';
process.env.PANW_AI_SEC_DEBUG_BODY = 'false';
process.env.PANW_AI_SEC_TIMEOUT_MS = '20000';
const beforeFetch = globalThis.fetch;
const traffic: Array<Record<string, unknown>> = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const response = await beforeFetch(input, init);
  if (url.pathname.endsWith('/access_token')) {
    const form = new URLSearchParams(typeof init?.body === 'string' ? init.body : '');
    traffic.push({
      operation: 'oauth',
      status: response.status,
      clientCredentials: form.get('grant_type') === 'client_credentials',
      tenantScoped: form.get('scope') === `tsg_id:${tenant}`,
    });
  } else {
    const headers = new Headers(init?.headers);
    traffic.push({
      operation: url.pathname.split('/').at(-1),
      host: url.hostname,
      status: response.status,
      method: init?.method,
      oauthBearer: headers.get('authorization')?.startsWith('Bearer ') ?? false,
      tenantHeader: headers.get('x-tsg-id') === tenant,
      browserHeaders: headers.has('cookie') || headers.has('origin') || headers.has('referer'),
      responseBytes: Buffer.byteLength(await response.clone().text()),
    });
  }
  return response;
};
function object(value: unknown): Record<string, unknown> {
  assert(
    value && typeof value === 'object' && !Array.isArray(value),
    'Expected populated JSON object',
  );
  return value as Record<string, unknown>;
}

try {
  const mgmt = new ManagementClient({
    clientId: credential('mgmtClientId'),
    clientSecret: credential('mgmtClientSecret'),
    tsgId: tenant,
    dashboardEndpoint: 'https://api.apps.paloaltonetworks.com/aisec',
    tokenEndpoint:
      typeof config.mgmtTokenEndpoint === 'string' ? config.mgmtTokenEndpoint : undefined,
    numRetries: 0,
  });
  const daily = { timeInterval: 1, timeUnit: 'day' } as const;
  const apps = object(await mgmt.dashboard.appsListRaw({ timeInterval: 30, timeUnit: 'days' }));
  const chart = object(await mgmt.dashboard.sessionsChartRaw(daily));
  const overview = object(
    await mgmt.dashboard.sessionsOverviewRaw({ ...daily, limit: 25, offset: 0 }),
  );
  assert(Array.isArray(overview.items), 'Missing session inventory');
  const row = overview.items
    .map(object)
    .find((entry) => entry.application_name === 'prisma-airs-terminal');
  assert(row, 'Terminal session not found on first inventory page');
  assert(
    typeof row.session_id === 'string' &&
      typeof row.application_id === 'string' &&
      typeof row.application_name === 'string',
  );
  const sessionQuery = {
    sessionId: row.session_id,
    appId: row.application_id,
    appName: row.application_name,
    timeInterval: 30,
    timeUnit: 'days',
  } as const;
  const session = object(
    await mgmt.dashboard.sessionRaw({ ...sessionQuery, offset: 0, limit: 25 }),
  );
  assert(
    Array.isArray(session.session_actions) && session.session_actions.length,
    'No session actions',
  );
  const action = object(session.session_actions[0]);
  assert(typeof action.scan_id === 'string' && typeof action.scan_sub_req_id === 'number');
  const scanQuery = { scanId: action.scan_id, scanSubReqId: action.scan_sub_req_id };
  const transaction = object(
    await mgmt.dashboard.sessionTransactionRaw({ ...sessionQuery, ...scanQuery }),
  );
  const content = object(await mgmt.dashboard.scanContentRaw(scanQuery));
  for (const [operation, payload] of Object.entries({
    apps,
    chart,
    overview,
    session,
    transaction,
    content,
  })) {
    console.log(JSON.stringify({ stage: 'raw', operation, fields: Object.keys(payload) }));
  }
  const parsedApps = DashboardAppsListSchema.parse(apps);
  const parsedChart = DashboardSessionsChartSchema.parse(chart);
  const parsedOverview = DashboardSessionsOverviewSchema.parse(overview);
  const parsedSession = DashboardSessionSchema.parse(session);
  const parsedTransaction = DashboardSessionTransactionSchema.parse(transaction);
  const parsedContent = DashboardScanContentSchema.parse(content);
  for (const [parsed, raw] of [
    [parsedApps, apps],
    [parsedChart, chart],
    [parsedOverview, overview],
    [parsedSession, session],
    [parsedTransaction, transaction],
    [parsedContent, content],
  ])
    assert.deepEqual(parsed, raw, 'Model lost or transformed live fields');
  const typedApps = await mgmt.dashboard.appsList({ timeInterval: 30, timeUnit: 'days' });
  const typedChart = await mgmt.dashboard.sessionsChart(daily);
  const typedOverview = await mgmt.dashboard.sessionsOverview({ ...daily, limit: 25, offset: 0 });
  const typedSession = await mgmt.dashboard.session({ ...sessionQuery, limit: 25, offset: 0 });
  const typedTransaction = await mgmt.dashboard.sessionTransaction({
    ...sessionQuery,
    ...scanQuery,
  });
  const typedContent = await mgmt.dashboard.scanContent(scanQuery);
  assert.equal(typedSession.id, sessionQuery.sessionId);
  assert.equal(typedSession.application.id, sessionQuery.appId);
  assert.equal(typedSession.application.name, sessionQuery.appName);
  assert.equal(typedTransaction.session_id, sessionQuery.sessionId);
  assert.equal(typedTransaction.scan_id, scanQuery.scanId);
  assert.equal(typedTransaction.scan_sub_req_id, scanQuery.scanSubReqId);
  assert.equal(typedContent.scan_id, scanQuery.scanId);
  assert.equal(typedContent.sub_scan_req_id, scanQuery.scanSubReqId);
  assert(
    typedContent.scan_contents &&
      Object.values(typedContent.scan_contents).some(
        (value) => typeof value === 'string' && value.length > 0,
      ),
    'No stored scan text retrieved',
  );

  // Walk every session page, bounding work and refusing to call a capped inventory complete.
  const identities = new Set<string>();
  let offset = 0;
  let inventoryComplete = false;
  let page = typedOverview;
  const expectedTotal = typedOverview.pagination.total_items;
  assert(
    typeof expectedTotal === 'number' && Number.isSafeInteger(expectedTotal) && expectedTotal >= 0,
    'Missing or invalid session inventory total',
  );
  for (let index = 0; index < 100; index++) {
    if (index > 0) page = await mgmt.dashboard.sessionsOverview({ ...daily, limit: 25, offset });
    assert.equal(page.pagination.skip, offset);
    assert.equal(page.pagination.limit, 25);
    assert.equal(
      page.pagination.total_items,
      expectedTotal,
      'Session inventory total changed while paging',
    );
    for (const item of page.items) {
      const id = JSON.stringify([item.application_id, item.application_name, item.session_id]);
      assert(!identities.has(id), 'Repeated session across inventory pages');
      identities.add(id);
    }
    offset += page.items.length;
    assert(offset <= expectedTotal, 'Session inventory exceeds reported total');
    if (offset === expectedTotal) {
      inventoryComplete = true;
      break;
    }
    assert(page.items.length > 0, 'Inventory ended before reported total');
  }
  assert(inventoryComplete, 'Session pagination cap reached');
  const actionPage = await mgmt.dashboard.session({ ...sessionQuery, limit: 1, offset: 0 });
  assert.equal(actionPage.pagination.limit, 1);
  assert.equal(actionPage.pagination.skip, 0);
  assert(actionPage.session_actions.length <= 1);
  const auth = traffic.filter((entry) => entry.operation === 'oauth');
  const reads = traffic.filter((entry) => entry.operation !== 'oauth');
  assert.equal(auth.length, 1, 'Expected one fresh OAuth token reused throughout the workflow');
  assert(
    auth.every((entry) => entry.status === 200 && entry.clientCredentials && entry.tenantScoped),
  );
  assert(
    reads.every(
      (entry) =>
        entry.status === 200 &&
        entry.host === 'api.apps.paloaltonetworks.com' &&
        entry.method === 'GET' &&
        entry.oauthBearer &&
        entry.tenantHeader &&
        !entry.browserHeaders &&
        Number(entry.responseBytes) > 0,
    ),
  );
  console.log(
    JSON.stringify({
      stage: 'validated',
      capturedAt: new Date().toISOString(),
      rawModelsLossless: true,
      typedMethodsPassed: 6,
      applications: typedApps.applications.length,
      chartBuckets: typedChart.buckets.length,
      chartSessions: typedChart.buckets.reduce((sum, bucket) => sum + bucket.total, 0),
      chartViolatingSessions: typedChart.buckets.reduce((sum, bucket) => sum + bucket.violating, 0),
      firstSessionPage: typedOverview.items.length,
      inventoryComplete,
      inventoryTotalStable: true,
      paginatedSessions: identities.size,
      sessionActions: typedSession.session_actions.length,
      actionPageLimitVerified: true,
      transactionStatus: typedTransaction.status,
      transactionTokens: typedTransaction.tokens,
      transactionLatencyMs: typedTransaction.ai_traffic_latency_ms,
      scanContentRetrieved: true,
      scanContentPrintedOrSaved: false,
      oauthRequests: auth.length,
      readRequests: reads.length,
      allHttp200: true,
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
  globalThis.fetch = beforeFetch;
  const configUnchanged = original.equals(readFileSync(configPath));
  console.log(JSON.stringify({ configUnchanged }));
  if (!configUnchanged) process.exitCode = 1;
}
