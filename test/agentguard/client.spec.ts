import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AgentGuardClient,
  AgentGuardScanListSchema,
  AgentGuardScanListOptionsSchema,
  globalConfiguration,
  ModelSecurityClient,
} from '../../src/index.js';

const id = '550e8400-e29b-41d4-a716-446655440000';
const scan = {
  uuid: id,
  tsg_id: '123',
  created_at: '2026-09-08T10:00:00.123456789Z',
  updated_at: '2026-09-08T10:00:00Z',
  name: 'PRIVATE-NAME',
  git_url: null,
  artifact_type: 'SKILL',
  status: 'COMPLETED',
  error_message: null,
  summary: { vulnerability_count: 2, attack_chain_count: 0, future: true },
  eval_outcome: 'BLOCKED',
  eval_summary: null,
  eval_details: null,
  duration_seconds: 0.3,
  fingerprint: 'PRIVATE-FINGERPRINT',
  scanner_version: null,
  device_metadata: { secret: 'PRIVATE-DEVICE' },
  parent_uuid: null,
  is_batch: false,
  child_scan_uuids: [],
  batch_summary: null,
  future: true,
};
const scans = { pagination: { total_items: 1 }, scans: [scan] };
const stats = {
  unique_skills_scanned: { count: 2, percent_change: null },
  total_vulnerabilities_found: { count: 14, percent_change: -1.5 },
  top_vulnerability: null,
};
const rules = {
  pagination: { total_items: 1 },
  rules: [
    {
      uuid: id,
      name: 'Secrets',
      vulnerability_types: ['SECRET_EXPOSURE'],
      default_state: 'BLOCKING',
      description: '',
      remediation: '',
      future: 1,
    },
  ],
};
const vulnerabilities = {
  pagination: { total_items: 1 },
  vulnerabilities: [
    {
      uuid: id,
      tsg_id: '123',
      created_at: '',
      updated_at: '',
      scan_uuid: id,
      title: 'PRIVATE-TITLE',
      description: 'PRIVATE-DESCRIPTION',
      vulnerability_type: 'SECRET_EXPOSURE',
      file_path: 'PRIVATE-PATH',
      node_id: null,
      node_type: null,
      node_name: null,
      remediation_description: null,
      original_code: 'PRIVATE-CODE',
      suggested_code: null,
      attack_chain_count: 0,
      attack_chain_uuids: [],
      type_description: '',
    },
  ],
};
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const opts = {
  clientId: 'client',
  clientSecret: 'SECRET',
  tsgId: '123',
  tokenEndpoint: 'https://auth.example/token',
  numRetries: 0,
};

describe('AgentGuard browser API', () => {
  const fetch = vi.fn();
  beforeEach(() => {
    globalConfiguration.reset();
    vi.stubGlobal('fetch', fetch);
    fetch.mockImplementation(async (url: string) => {
      const path = new URL(url).pathname;
      if (path === '/token')
        return response({ access_token: 'PRIVATE-TOKEN', token_type: 'Bearer', expires_in: 3600 });
      if (path.endsWith('/vulnerabilities')) return response(vulnerabilities);
      if (path.endsWith('/stats/scans')) return response(stats);
      if (path.endsWith('/rules')) return response(rules);
      return response(scans);
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetch.mockReset();
    globalConfiguration.reset();
  });

  it('shares fresh OAuth credentials across all four GETs and sends the tenant header', async () => {
    const client = new AgentGuardClient(opts);
    expect(await client.listScans({ skip: 0, limit: 10, isBackgroundRefresh: false })).toEqual(
      scans,
    );
    expect(await client.getScanStats()).toEqual(stats);
    expect(await client.listScanVulnerabilities(id)).toEqual(vulnerabilities);
    expect(await client.listRules({ limit: 100, skip: 0 })).toEqual(rules);
    expect(fetch.mock.calls.filter(([url]) => new URL(url).pathname === '/token')).toHaveLength(1);
    const requests = fetch.mock.calls.slice(1);
    for (const [, init] of requests) {
      expect(init.method).toBe('GET');
      expect(init.headers).toMatchObject({
        Authorization: 'Bearer PRIVATE-TOKEN',
        'x-tsg-id': '123',
      });
    }
    expect(new URL(requests[0][0]).searchParams.get('isBackgroundRefresh')).toBe('false');
    expect(new URL(requests[0][0]).searchParams.get('skip')).toBe('0');
    expect(new URL(requests[1][0]).searchParams.get('time_period')).toBe('30_DAYS');
    expect(new URL(requests[3][0]).pathname).toBe('/aiag/mgmt/v1/rules');
  });
  it.each([
    { skip: -1 },
    { limit: 0 },
    { limit: 1.2 },
    { limit: Infinity },
    { skip: Number.MAX_SAFE_INTEGER + 1 },
    { start_time: 'bad' },
    { end_time: 'bad' },
    { start_time: '2026-09-08T00:00:00Z', end_time: '2026-09-07T00:00:00Z' },
    { isBackgroundRefresh: 'false' },
    { unknown: 'PRIVATE-SECRET' },
  ])('rejects malformed scan queries before OAuth: %j', async (options) => {
    await expect(new AgentGuardClient(opts).listScans(options as never)).rejects.toMatchObject({
      errorType: 'AISEC_USER_REQUEST_PAYLOAD_ERROR',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('validates rules, statistics and UUID queries without leaking rejected input', async () => {
    const c = new AgentGuardClient(opts);
    await expect(c.listRules({ limit: 0 })).rejects.toThrow('Invalid AgentGuard query');
    await expect(c.getScanStats({ time_period: 'PRIVATE-SECRET' } as never)).rejects.not.toThrow(
      'PRIVATE-SECRET',
    );
    await expect(c.listScanVulnerabilities('../escape')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('uses product-specific endpoint and credential environment variables', async () => {
    for (const [k, v] of Object.entries({
      CLIENT_ID: 'env-client',
      CLIENT_SECRET: 'env-secret',
      TSG_ID: '456',
      DATA_ENDPOINT: 'https://data.example',
      MGMT_ENDPOINT: 'https://mgmt.example',
      TOKEN_ENDPOINT: opts.tokenEndpoint,
    }))
      vi.stubEnv(`PANW_AGENT_GUARD_${k}`, v);
    const c = new AgentGuardClient();
    await c.listScans();
    await c.listRules();
    expect(fetch.mock.calls[1][0]).toBe('https://data.example/v1/scans');
    expect(fetch.mock.calls[2][0]).toBe('https://mgmt.example/v1/rules');
    expect(fetch.mock.calls[1][1].headers['x-tsg-id']).toBe('456');
  });
  it('falls back to shared Management OAuth credentials', async () => {
    vi.stubEnv('PANW_MGMT_CLIENT_ID', 'client');
    vi.stubEnv('PANW_MGMT_CLIENT_SECRET', 'secret');
    vi.stubEnv('PANW_MGMT_TSG_ID', '123');
    vi.stubEnv('PANW_MGMT_TOKEN_ENDPOINT', opts.tokenEndpoint);
    await new AgentGuardClient().listScans();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('preserves new fields, statuses, nullable evaluation details and nanosecond timestamps', () => {
    expect(
      AgentGuardScanListSchema.parse({
        ...scans,
        scans: [
          { ...scan, status: 'FAILED', summary: null, duration_seconds: null, eval_outcome: null },
        ],
      }).scans[0].summary,
    ).toBeNull();
    expect(
      AgentGuardScanListSchema.parse({ ...scans, scans: [{ ...scan, status: 'FUTURE' }] }).scans[0],
    ).toMatchObject({
      status: 'FUTURE',
      future: true,
      eval_details: null,
      summary: { future: true },
    });
    expect(
      AgentGuardScanListOptionsSchema.parse({
        start_time: '2026-09-08T00:00:00+01:00',
        end_time: '2026-09-08T00:00:00Z',
      }),
    ).toBeDefined();
  });
  it('surfaces malformed successful responses as validation errors', async () => {
    fetch.mockImplementation(async (url: string) =>
      new URL(url).pathname === '/token'
        ? response({ access_token: 't', expires_in: 3600, token_type: 'Bearer' })
        : response({ scans: [] }),
    );
    await expect(new AgentGuardClient(opts).listScans()).rejects.toMatchObject({
      errorType: 'AISEC_RESPONSE_VALIDATION',
    });
  });
  it('preserves HTTP failures', async () => {
    fetch.mockImplementation(async (url: string) =>
      new URL(url).pathname === '/token'
        ? response({ access_token: 't', expires_in: 3600, token_type: 'Bearer' })
        : response({ error: 'PRIVATE-ERROR' }, 400),
    );
    await expect(new AgentGuardClient(opts).listScans()).rejects.toMatchObject({ statusCode: 400 });
  });
  it('omits sensitive bodies even with SDK debug-body explicitly enabled', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', '1');
    const logs = vi.spyOn(console, 'error').mockImplementation(() => {});
    await new AgentGuardClient(opts).listScanVulnerabilities(id);
    expect(JSON.stringify(logs.mock.calls)).not.toMatch(
      /PRIVATE-(TOKEN|CODE|DESCRIPTION|PATH|TITLE)/,
    );
  });
  it('serializes the Model Security browser refresh flag without dropping false', async () => {
    fetch.mockImplementation(async (url: string) =>
      new URL(url).pathname === '/token'
        ? response({ access_token: 't', expires_in: 3600, token_type: 'Bearer' })
        : response(
            new URL(url).pathname.endsWith('/models')
              ? { pagination: { total_items: 0 }, models: [] }
              : { pagination: { total_items: 0 }, scans: [] },
          ),
    );
    const c = new ModelSecurityClient(opts);
    await c.models.listModels({ isBackgroundRefresh: false });
    await c.scans.list({ isBackgroundRefresh: true });
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get('isBackgroundRefresh')).toBe('false');
    expect(new URL(fetch.mock.calls[2][0]).searchParams.get('isBackgroundRefresh')).toBe('true');
    await expect(c.scans.list({ isBackgroundRefresh: 'bad' } as never)).rejects.toThrow();
    await expect(c.models.listModels({ isBackgroundRefresh: 'bad' } as never)).rejects.toThrow();
  });
});
