import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DashboardClient,
  ErrorType,
  type DashboardSessionQuery,
  type DashboardSessionTransactionQuery,
  type DashboardScanContentQuery,
} from '../../src/index.js';
import type { PreparedRequest } from '../../src/http/types.js';

const identity = { sessionId: 'pan_demo-session', appId: 'demo-app', appName: 'demo & app / name' };
const scan = { scanId: 'demo-scan', scanSubReqId: 0 };
const severity = { critical: 0, high: 0, low: 0, medium: 0, total: 0, future_severity: 0 };
const detectors = [{ detection_type: 'future_detector', violation_breakdown: severity }];
const item = {
  application_id: identity.appId,
  application_name: identity.appName,
  session_id: identity.sessionId,
  last_session_activity: '2026-09-07T16:04:37.123456789Z',
  violation_status: 'passed',
  violation_breakdown: severity,
  detection_type_violation_breakdown: detectors,
};
const action = {
  application_id: identity.appId,
  application_name: identity.appName,
  session_id: identity.sessionId,
  scan_id: scan.scanId,
  scan_sub_req_id: 0,
  transaction_id: 'transaction-not-session',
  correlation_type: null,
  enable_full_conversation_inspection: null,
  kind: ['model_response', 'future_kind'],
  profile_name: 'demo-profile',
  start_time: '2026-09-07T16:04:37Z',
  status: 'future_status',
  violation_breakdown: severity,
  detection_type_violation_breakdown: detectors,
};
const apps = {
  applications: [
    { application_id: 'same', application_name: 'first' },
    { application_id: 'same', application_name: 'second' },
    { application_id: 'another', application_name: 'first' },
  ],
  future: true,
};
const chart = {
  bucket_size_seconds: 8640,
  buckets: [
    {
      bucket_number: 0,
      time: '2026-09-06T16:16:10.474186234Z',
      total: 36,
      violating: 12,
      violation_breakdown: { ...severity, total: 22, low: 10, medium: 12 },
      detection_type_violation_breakdown: [],
    },
  ],
  future: true,
};
const overview = {
  items: [item],
  pagination: { limit: 25, skip: 0, total_items: 1 },
  future: true,
};
const session = {
  application: { id: identity.appId, name: identity.appName },
  id: identity.sessionId,
  session_actions: [action],
  pagination: { limit: 25, skip: 0, total_items: 1 },
  cloud: 'other',
  source: 'api',
  start_time: '2026-09-07T16:04:37Z',
  end_time: null,
  last_session_activity: '2026-09-07T16:04:37Z',
  violation_status: 'passed',
  future: true,
};
const transaction = {
  ...action,
  ai_traffic_latency_ms: 192,
  attributes: {
    environment: 'prod',
    model_name: 'None',
    profile: 'demo',
    text_records: 1,
    user_id: 'synthetic-user',
    user_ip: 'None',
    future: { value: true },
  },
  enable_full_conversation_inspection: false,
  end_time: '2026-09-07T16:04:37Z',
  timeout: false,
  tokens: 13,
};
const content = {
  report_id: 'report',
  scan_id: scan.scanId,
  sub_scan_req_id: 0,
  transaction_id: identity.sessionId,
  scan_contents: {
    response: 'synthetic private response',
    prompt: null,
    future: { retained: true },
  },
};

const cases = [
  {
    name: 'appsList',
    path: '/v1/mgmt/dashboard/v2/apps/appslist',
    raw: (c: DashboardClient) => c.appsListRaw(),
    typed: (c: DashboardClient) => c.appsList(),
    payload: apps,
    query: { time_interval: '30', time_unit: 'days' },
    suppressTyped: false,
  },
  {
    name: 'sessionsChart',
    path: '/v1/mgmt/dashboard/v2/sessions/sessionschart',
    raw: (c: DashboardClient) => c.sessionsChartRaw(),
    typed: (c: DashboardClient) => c.sessionsChart(),
    payload: chart,
    query: { time_interval: '1', time_unit: 'day' },
    suppressTyped: false,
  },
  {
    name: 'sessionsOverview',
    path: '/v1/mgmt/dashboard/v2/sessions/sessionsoverview',
    raw: (c: DashboardClient) => c.sessionsOverviewRaw(),
    typed: (c: DashboardClient) => c.sessionsOverview(),
    payload: overview,
    query: { time_interval: '1', time_unit: 'day', limit: '25', offset: '0' },
    suppressTyped: true,
  },
  {
    name: 'session',
    path: '/v1/mgmt/dashboard/v2/sessions/session',
    raw: (c: DashboardClient) => c.sessionRaw(identity),
    typed: (c: DashboardClient) => c.session(identity),
    payload: session,
    query: {
      session_id: identity.sessionId,
      app_id: identity.appId,
      app_name: identity.appName,
      offset: '0',
      limit: '25',
      time_interval: '30',
      time_unit: 'days',
    },
    suppressTyped: true,
  },
  {
    name: 'sessionTransaction',
    path: '/v1/mgmt/dashboard/v2/sessions/sessiontransaction',
    raw: (c: DashboardClient) => c.sessionTransactionRaw({ ...identity, ...scan }),
    typed: (c: DashboardClient) => c.sessionTransaction({ ...identity, ...scan }),
    payload: transaction,
    query: {
      session_id: identity.sessionId,
      app_id: identity.appId,
      app_name: identity.appName,
      scan_id: scan.scanId,
      scan_sub_req_id: '0',
      time_interval: '30',
      time_unit: 'days',
    },
    suppressTyped: true,
  },
  {
    name: 'scanContent',
    path: '/v1/mgmt/reports/scancontent',
    raw: (c: DashboardClient) => c.scanContentRaw(scan),
    typed: (c: DashboardClient) => c.scanContent(scan),
    payload: content,
    query: { scan_id: scan.scanId, scan_sub_req_id: '0' },
    suppressTyped: true,
  },
];

describe('Dashboard session drill-down', () => {
  const originalFetch = globalThis.fetch;
  const prepare = vi.fn(async (req: PreparedRequest) => ({
    ...req,
    headers: { ...req.headers, Authorization: 'Bearer fake-test-token' },
  }));
  let client: DashboardClient;
  beforeEach(() => {
    prepare.mockClear();
    client = new DashboardClient({
      baseUrl: 'https://dashboard.example.test/aisec/',
      auth: { prepare },
      tsgId: 'tenant',
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  const respond = (value: unknown) => {
    globalThis.fetch = vi.fn().mockImplementation(async () => Response.json(value));
  };

  describe.each(cases)('$name', ({ path, raw, typed, payload, query, suppressTyped }) => {
    it('maps the exact route and query, retaining zero sub-request indices', async () => {
      respond(payload);
      await raw(client);
      await typed(client);
      for (const [input, init] of vi.mocked(globalThis.fetch).mock.calls) {
        const url = new URL(String(input));
        expect(url.origin).toBe('https://dashboard.example.test');
        expect(url.pathname).toBe(`/aisec${path}`);
        expect(Object.fromEntries(url.searchParams)).toEqual(query);
        expect(init?.method).toBe('GET');
        expect(init?.body).toBeUndefined();
        expect(new Headers(init?.headers).get('x-tsg-id')).toBe('tenant');
        expect(new Headers(init?.headers).get('authorization')).toBe('Bearer fake-test-token');
      }
    });
    it('preserves all typed fields, nullable values, and unknown metadata', async () => {
      respond(payload);
      expect(await typed(client)).toEqual(payload);
    });
    it('keeps unstructured JSON unconstrained', async () => {
      respond({ alternate: [1, null, 'value'] });
      expect(await raw(client)).toEqual({ alternate: [1, null, 'value'] });
    });
    it.each([{}, null, []])('rejects invalid typed envelopes: %j', async (value) => {
      respond(value);
      await expect(typed(client)).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
    it.each([200, 204])(
      'distinguishes an empty HTTP %i body from an empty collection',
      async (status) => {
        globalThis.fetch = vi.fn().mockImplementation(async () => new Response(null, { status }));
        expect(await raw(client)).toBeUndefined();
        await expect(typed(client)).rejects.toMatchObject({
          errorType: ErrorType.RESPONSE_VALIDATION,
        });
      },
    );
    it('rejects non-JSON responses in both paths', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async () => new Response('<html>error</html>'));
      await expect(raw(client)).rejects.toMatchObject({ errorType: ErrorType.RESPONSE_VALIDATION });
      await expect(typed(client)).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
    it.each([400, 401, 403, 500])('preserves HTTP %i errors with zero retries', async (status) => {
      globalThis.fetch = vi.fn().mockImplementation(async () => new Response('failed', { status }));
      await expect(raw(client)).rejects.toMatchObject({ statusCode: status });
      await expect(typed(client)).rejects.toMatchObject({ statusCode: status });
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
    it('suppresses all raw and sensitive typed debug bodies', async () => {
      vi.stubEnv('PANW_AI_SEC_DEBUG', 'true');
      vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', 'true');
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      respond({ ...payload, confidential: 'synthetic-body-marker' });
      await raw(client);
      if (suppressTyped) await typed(client);
      const output = log.mock.calls.flat().join(' ');
      expect(output).not.toContain('synthetic-body-marker');
      expect(output).not.toContain('synthetic private response');
      expect(output).not.toContain('synthetic-user');
      expect(output).not.toContain('fake-test-token');
    });
  });
  it('allows explicit empty collections and null stored content without inventing text', async () => {
    respond({ ...apps, applications: [] });
    expect((await client.appsList()).applications).toEqual([]);
    respond({ ...chart, buckets: [] });
    expect((await client.sessionsChart()).buckets).toEqual([]);
    respond({ ...overview, items: [] });
    expect((await client.sessionsOverview()).items).toEqual([]);
    respond({ ...session, session_actions: [] });
    expect((await client.session(identity)).session_actions).toEqual([]);
    respond({ ...content, scan_contents: null });
    expect((await client.scanContent(scan)).scan_contents).toBeNull();
  });
  it('preserves paging/window overrides', async () => {
    respond(overview);
    await client.sessionsOverview({ limit: 10, offset: 20, timeInterval: 7, timeUnit: 'days' });
    expect(
      new URL(String(vi.mocked(globalThis.fetch).mock.calls[0][0])).searchParams.get('offset'),
    ).toBe('20');
    respond(session);
    await client.session({ ...identity, limit: 1, offset: 2, timeInterval: 7, timeUnit: 'days' });
    expect(
      Object.fromEntries(
        new URL(String(vi.mocked(globalThis.fetch).mock.calls[0][0])).searchParams,
      ),
    ).toMatchObject({ offset: '2', limit: '1', time_interval: '7' });
  });
  it.each([
    { limit: 0 },
    { offset: -1 },
    { offset: 1.5 },
    { timeInterval: 0 },
    { timeUnit: '' },
    { extra: true },
  ])('validates paged queries before authentication: %j', async (override) => {
    await expect(client.sessionsOverview(override)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    await expect(client.session({ ...identity, ...override })).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(prepare).not.toHaveBeenCalled();
  });
  it.each([{ sessionId: '' }, { appId: '' }, { appName: ' ' }])(
    'rejects blank session identity: %j',
    async (override) => {
      await expect(
        client.session({ ...identity, ...override } as DashboardSessionQuery),
      ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
      await expect(
        client.sessionTransaction({ ...identity, ...scan, ...override }),
      ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
      expect(prepare).not.toHaveBeenCalled();
    },
  );
  it.each([
    { scanId: '' },
    { scanSubReqId: -1 },
    { scanSubReqId: 0.5 },
    { scanSubReqId: '0' },
    { scanSubReqId: NaN },
    { scanSubReqId: undefined },
  ])('rejects invalid scan identity: %j', async (override) => {
    await expect(
      client.scanContent({ ...scan, ...override } as DashboardScanContentQuery),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    await expect(
      client.sessionTransaction({
        ...identity,
        ...scan,
        ...override,
      } as DashboardSessionTransactionQuery),
    ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    expect(prepare).not.toHaveBeenCalled();
  });
  it('does not confuse response sub_scan_req_id with the query field name', async () => {
    respond({ ...content, sub_scan_req_id: undefined, scan_sub_req_id: 0 });
    await expect(client.scanContent(scan)).rejects.toMatchObject({
      errorType: ErrorType.RESPONSE_VALIDATION,
    });
  });
});
