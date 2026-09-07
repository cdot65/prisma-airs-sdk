import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DashboardClient,
  ManagementClient,
  ErrorType,
  DashboardApplicationSchema,
  DashboardTopApplicationsViolationsSchema,
  DashboardApplicationsViolationsTrendSchema,
  type DashboardAppQuery,
  type DashboardTimeRangeQuery,
} from '../../src/index.js';

const appQuery = {
  appId: 'synthetic-app',
  appName: 'Demo / Academy & AI',
  timeInterval: 30,
  timeUnit: 'days',
} as const;
const application = {
  id: 'synthetic-app',
  name: 'Demo Academy',
  cloud: 'self-hosted',
  source: 'api',
  created_at: '2026-09-06T11:09:02Z',
  updated_at: '2026-09-06T16:36:44Z',
  has_webhook_sig: false,
  profiles: ['demo-profile'],
  session_stats: {
    total: 174,
    violating: 34,
    violation_breakdown: { critical: 0, high: 0, low: 14, medium: 26, total: 40 },
  },
  token_stats: {
    average_daily_tokens: 4.344751,
    average_daily_tokens_scale: 'M',
    monthly_total_tokens: 4.344751,
    monthly_total_tokens_scale: 'M',
  },
  future: { retained: true },
};
const breakdown = {
  detection_type_violation_breakdown: [
    { detection_type: 'pi', violation_breakdown: { medium: 26, total: 26 } },
    { detection_type: 'dlp', violation_breakdown: { low: 7, total: 7 } },
    { detection_type: 'uf', violation_breakdown: { low: 7, total: 7 } },
  ],
  total_violating: 40,
};
const top = {
  applications: [
    {
      id: 'shared-id',
      name: 'Demo Gateway',
      policy_violations: [
        { detection_type: 'future_detector', total: 62, extension: true },
        { detection_type: 'dlp', total: 3 },
      ],
      total_violations: 65,
      extension: { retained: true },
    },
    { id: 'shared-id', name: 'Demo CLI', policy_violations: [], total_violations: 0 },
  ],
  extension: true,
};
const trend = {
  violations: [
    {
      bucket_number: 9,
      date: '2026-09-07T13:43:39.038087213Z',
      violation_breakdown: {
        critical: 0,
        high: 0,
        low: 0,
        medium: 16,
        total: 16,
        future_severity: 2,
      },
      extension: true,
    },
    { bucket_number: 0, date: '2026-09-06T16:07:39Z', violation_breakdown: { total: 22 } },
  ],
  extension: true,
};

const cases = [
  {
    name: 'application',
    path: 'application',
    raw: (c: DashboardClient) => c.applicationRaw(appQuery),
    typed: (c: DashboardClient) => c.application(appQuery),
    payload: application,
  },
  {
    name: 'breakdown',
    path: 'applicationviolationbreakdown',
    raw: (c: DashboardClient) => c.applicationViolationBreakdownRaw(appQuery),
    typed: (c: DashboardClient) => c.applicationViolationBreakdown(appQuery),
    payload: breakdown,
  },
  {
    name: 'top',
    path: 'topapplicationsviolations',
    raw: (c: DashboardClient) => c.topApplicationsViolationsRaw(),
    typed: (c: DashboardClient) => c.topApplicationsViolations(),
    payload: top,
  },
  {
    name: 'trend',
    path: 'applicationsviolationstrend',
    raw: (c: DashboardClient) => c.applicationsViolationsTrendRaw(),
    typed: (c: DashboardClient) => c.applicationsViolationsTrend(),
    payload: trend,
  },
];

describe('SCM dashboard extensions', () => {
  const originalFetch = globalThis.fetch;
  const prepare = vi.fn(async (req) => ({
    ...req,
    headers: { ...req.headers, Authorization: 'Bearer synthetic-token' },
  }));
  let client: DashboardClient;
  beforeEach(() => {
    prepare.mockClear();
    client = new DashboardClient({
      baseUrl: 'https://dashboard.example.test/aisec/',
      tsgId: 'test-tenant',
      auth: { prepare },
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

  describe.each(cases)('$name', ({ path, raw, typed, payload }) => {
    it('uses the scoped host, OAuth, tenant header, and correct encoded query', async () => {
      respond(payload);
      await raw(client);
      await typed(client);
      for (const [input, init] of vi.mocked(globalThis.fetch).mock.calls) {
        const url = new URL(String(input));
        expect(url.origin).toBe('https://dashboard.example.test');
        expect(url.pathname).toBe(`/aisec/v1/mgmt/dashboard/v2/apps/${path}`);
        expect(init?.method).toBe('GET');
        expect(init?.body).toBeUndefined();
        const headers = new Headers(init?.headers);
        expect(headers.get('authorization')).toBe('Bearer synthetic-token');
        expect(headers.get('x-tsg-id')).toBe('test-tenant');
        expect(headers.has('cookie')).toBe(false);
        if (path === 'application' || path === 'applicationviolationbreakdown') {
          expect(url.searchParams.get('appid')).toBe(appQuery.appId);
          expect(url.searchParams.get('appname')).toBe(appQuery.appName);
          expect(url.searchParams.get('time_interval')).toBe('30');
          expect(url.searchParams.get('time_unit')).toBe('days');
        } else {
          expect([...url.searchParams.keys()]).toEqual(['time_interval', 'time_unit']);
          expect(url.searchParams.get('time_interval')).toBe('1');
          expect(url.searchParams.get('time_unit')).toBe('day');
        }
      }
    });
    it('preserves the observed response and forward-compatible fields', async () => {
      respond(payload);
      expect(await typed(client)).toEqual(payload);
    });
    it('does not impose the typed model on raw JSON', async () => {
      const unknown = { new_shape: [null, { data: true }], message: 'undocumented' };
      respond(unknown);
      expect(await raw(client)).toEqual(unknown);
    });
    it.each([{}, null, []])('rejects a malformed typed envelope: %j', async (payload) => {
      respond(payload);
      await expect(typed(client)).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
    it.each([200, 204])('distinguishes empty HTTP %i from empty data', async (status) => {
      globalThis.fetch = vi.fn().mockImplementation(async () => new Response(null, { status }));
      expect(await raw(client)).toBeUndefined();
      await expect(typed(client)).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
    it('rejects invalid JSON in both paths', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async () => new Response('<html>error</html>'));
      for (const call of [raw, typed])
        await expect(call(client)).rejects.toMatchObject({
          errorType: ErrorType.RESPONSE_VALIDATION,
        });
    });
    it.each([400, 403, 500])('preserves HTTP %i failures without retries', async (status) => {
      globalThis.fetch = vi.fn().mockImplementation(async () => new Response('failed', { status }));
      await expect(raw(client)).rejects.toMatchObject({ statusCode: status });
      await expect(typed(client)).rejects.toMatchObject({ statusCode: status });
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });
    it('never logs unstructured response bodies, even with body debug enabled', async () => {
      vi.stubEnv('PANW_AI_SEC_DEBUG', 'true');
      vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', 'true');
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      respond({ confidential: 'private-dashboard-payload' });
      await raw(client);
      expect(log.mock.calls.flat().join(' ')).not.toContain('private-dashboard-payload');
      expect(log.mock.calls.flat().join(' ')).not.toContain('synthetic-token');
    });
  });

  it('keeps detector totals distinct from violating sessions and types the webhook flag', () => {
    const parsed = DashboardApplicationSchema.parse(application);
    expect(parsed.has_webhook_sig).toBe(false);
    expect(parsed.session_stats?.violating).toBe(34);
    expect(parsed.session_stats?.violation_breakdown?.total).toBe(40);
    expect(
      DashboardApplicationSchema.safeParse({ ...application, has_webhook_sig: 'false' }).success,
    ).toBe(false);
  });
  it('preserves ranked application identity, server order, and precise trend dates', () => {
    expect(DashboardTopApplicationsViolationsSchema.parse(top)).toEqual(top);
    expect(DashboardApplicationsViolationsTrendSchema.parse(trend)).toEqual(trend);
  });
  it('accepts explicit empty rankings, trends, and detector collections', async () => {
    respond({ applications: [] });
    expect(await client.topApplicationsViolations()).toEqual({ applications: [] });
    respond({ violations: [] });
    expect(await client.applicationsViolationsTrend()).toEqual({ violations: [] });
    respond({ detection_type_violation_breakdown: [], total_violating: 0 });
    expect((await client.applicationViolationBreakdown(appQuery)).total_violating).toBe(0);
  });
  it.each([
    { timeInterval: 0 },
    { timeInterval: -1 },
    { timeInterval: 1.5 },
    { timeInterval: Infinity },
    { timeInterval: NaN },
    { timeInterval: '1' },
    { timeUnit: '' },
    { timeUnit: '  ' },
    { timeUnit: null },
    { unexpected: true },
  ])('rejects invalid ranking/trend queries before auth: %j', async (query) => {
    for (const method of [
      'topApplicationsViolations',
      'topApplicationsViolationsRaw',
      'applicationsViolationsTrend',
      'applicationsViolationsTrendRaw',
    ] as const) {
      await expect(client[method](query as DashboardTimeRangeQuery)).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
    }
    expect(prepare).not.toHaveBeenCalled();
  });
  it.each([
    { appId: '' },
    { appName: '   ' },
    { timeInterval: 1 },
    { timeUnit: 'hours' },
    { unexpected: true },
  ])('rejects invalid detail queries before auth: %j', async (override) => {
    for (const method of [
      'application',
      'applicationRaw',
      'applicationViolationBreakdown',
      'applicationViolationBreakdownRaw',
    ] as const) {
      await expect(
        client[method]({ ...appQuery, ...override } as DashboardAppQuery),
      ).rejects.toMatchObject({ errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR });
    }
    expect(prepare).not.toHaveBeenCalled();
  });
  it('serializes explicit ranking/trend windows without leaking extra query keys', async () => {
    for (const call of [
      () => client.topApplicationsViolationsRaw({ timeInterval: 7, timeUnit: 'days' }),
      () => client.applicationsViolationsTrendRaw({ timeInterval: 7, timeUnit: 'days' }),
    ]) {
      respond({});
      await call();
      const url = new URL(String(vi.mocked(globalThis.fetch).mock.calls[0][0]));
      expect(url.search).toBe('?time_interval=7&time_unit=days');
    }
  });
  it('refreshes OAuth once after a 401 and retains the tenant header', async () => {
    let authCalls = 0;
    let reads = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (input, init) => {
      if (String(input).includes('/access_token'))
        return Response.json({
          access_token: `token-${++authCalls}`,
          token_type: 'Bearer',
          expires_in: 900,
        });
      const headers = new Headers(init?.headers);
      expect(headers.get('x-tsg-id')).toBe('tenant');
      expect(headers.get('authorization')).toBe(`Bearer token-${authCalls}`);
      return ++reads === 1 ? new Response('unauthorized', { status: 401 }) : Response.json(top);
    });
    const mgmt = new ManagementClient({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      tsgId: 'tenant',
      tokenEndpoint: 'https://auth.example.test/access_token',
      dashboardEndpoint: 'https://dashboard.example.test/aisec',
      numRetries: 0,
    });
    expect(await mgmt.dashboard.topApplicationsViolations()).toEqual(top);
    expect(authCalls).toBe(2);
    expect(reads).toBe(2);
  });
});
