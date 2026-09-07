/** Read-only feasibility probe. Prints metadata/counts only, never credentials or raw payloads. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ManagementClient, DashboardApplicationsOverviewSchema } from '../src/index.js';

const configPath = join(homedir(), '.prisma-airs', 'config.json');
const originalConfig = readFileSync(configPath);
const config = JSON.parse(originalConfig.toString('utf8')) as Record<string, unknown>;
const credential = (name: string): string => {
  const value = config[name];
  assert(typeof value === 'string' && value.trim(), `Missing configuration field: ${name}`);
  return value;
};
process.env.PANW_AI_SEC_DEBUG = 'false';
process.env.PANW_AI_SEC_DEBUG_BODY = 'false';
process.env.PANW_AI_SEC_TIMEOUT_MS = '20000';

const endpoint = 'https://api.apps.paloaltonetworks.com/aisec';
const tsgId = credential('mgmtTsgId');
const fetchBefore = globalThis.fetch;
const traffic: Array<Record<string, unknown>> = [];
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const headers = new Headers(init?.headers);
  const response = await fetchBefore(input, init);
  if (url.pathname.endsWith('/access_token')) {
    const form = new URLSearchParams(typeof init?.body === 'string' ? init.body : '');
    traffic.push({
      operation: 'oauth',
      status: response.status,
      clientCredentials: form.get('grant_type') === 'client_credentials',
      tenantScoped: form.get('scope') === `tsg_id:${tsgId}`,
    });
  } else if (url.pathname.endsWith('/applicationsoverview')) {
    traffic.push({
      operation: 'applicationsOverview',
      host: url.hostname,
      status: response.status,
      method: init?.method,
      oauthBearer: headers.get('authorization')?.startsWith('Bearer ') ?? false,
      tenantHeader: headers.get('x-tsg-id') === tsgId,
      browserHeaders:
        headers.has('origin') || headers.has('referer') || headers.has('sec-fetch-site'),
      responseBytes: Buffer.byteLength(await response.clone().text()),
    });
  }
  return response;
};

try {
  const mgmt = new ManagementClient({
    clientId: credential('mgmtClientId'),
    clientSecret: credential('mgmtClientSecret'),
    tsgId,
    tokenEndpoint:
      typeof config.mgmtTokenEndpoint === 'string' ? config.mgmtTokenEndpoint : undefined,
    dashboardEndpoint: endpoint,
    numRetries: 0,
  });
  const query = { timeInterval: 1, timeUnit: 'day', limit: 25, offset: 0 } as const;

  // Inspect the unstructured response FIRST; no endpoint model is imposed by this fetch.
  const raw = await mgmt.dashboard.applicationsOverviewRaw(query);
  assert(raw && typeof raw === 'object' && !Array.isArray(raw), 'Missing JSON object response');
  const envelope = raw as Record<string, unknown>;
  assert(Array.isArray(envelope.items), 'Response has no items array');
  assert(envelope.pagination && typeof envelope.pagination === 'object', 'Missing pagination');
  console.log(
    JSON.stringify({ stage: 'raw', fields: Object.keys(envelope), items: envelope.items.length }),
  );

  // Work backwards from the raw payload into the existing forward-compatible Zod model.
  const parsed = DashboardApplicationsOverviewSchema.parse(raw);
  assert.deepEqual(parsed, raw, 'Typed model discarded or transformed live fields');
  const typed = await mgmt.dashboard.applicationsOverview(query);
  assert(Array.isArray(typed.items), 'Typed fetch has no items array');

  // Exercise actual offset pagination, without assuming a tenant has any particular count.
  const identities = new Set<string>();
  let offset = 0;
  let paginationComplete = false;
  for (let pageNumber = 0; pageNumber < 20; pageNumber++) {
    const page = await mgmt.dashboard.applicationsOverview({ ...query, limit: 2, offset });
    assert(Array.isArray(page.items), 'Paginated fetch has no items array');
    assert.equal(page.pagination?.skip, offset, 'Server did not honor offset');
    assert.equal(page.pagination?.limit, 2, 'Server did not honor limit');
    for (const item of page.items) {
      const identity = JSON.stringify([item.id, item.name]);
      assert(!identities.has(identity), 'Repeated application bucket across pages');
      identities.add(identity);
    }
    offset += page.items.length;
    if (page.items.length < 2 || offset >= (page.pagination?.total_items ?? Infinity)) {
      paginationComplete = true;
      break;
    }
  }
  assert(paginationComplete, 'Pagination safety cap reached');
  const auth = traffic.filter((entry) => entry.operation === 'oauth');
  const reads = traffic.filter((entry) => entry.operation === 'applicationsOverview');
  assert.equal(auth.length, 1, 'Expected one fresh token reused across dashboard reads');
  assert(
    auth.every((entry) => entry.status === 200 && entry.clientCredentials && entry.tenantScoped),
  );
  assert(reads.every((entry) => entry.status === 200 && entry.oauthBearer && entry.tenantHeader));
  const target = parsed.items?.find((item) => item.name === 'Portkey-openai');
  console.log(
    JSON.stringify({
      stage: 'validated',
      capturedAt: new Date().toISOString(),
      endpoint,
      query,
      rawMatchesSchemaWithoutLoss: true,
      typedFetch: true,
      paginationComplete,
      paginatedItems: identities.size,
      items: parsed.items?.length,
      sessions: parsed.items?.reduce((sum, item) => sum + (item.sessions_total ?? 0), 0),
      violatingSessions: parsed.items?.reduce(
        (sum, item) => sum + (item.sessions_violated ?? 0),
        0,
      ),
      portkeyOpenai: target
        ? { sessions: target.sessions_total, violating: target.sessions_violated }
        : null,
      traffic,
    }),
  );
} catch (error) {
  // SDK/Zod errors may contain live values; emit only the error classification.
  const value = error as { name?: string; errorType?: string; statusCode?: number };
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
  globalThis.fetch = fetchBefore;
  const configUnchanged = originalConfig.equals(readFileSync(configPath));
  console.log(JSON.stringify({ configUnchanged }));
  if (!configUnchanged) process.exitCode = 1;
}
