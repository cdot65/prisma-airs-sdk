import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayTelemetryClient } from '../../src/ai-gateway/telemetry-client.js';
import type { AuthAdapter } from '../../src/http/types.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}

function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const costBody = {
  success: true,
  data: {
    records: [{ x: '2026-07-20T05:00:00.000Z', y: 1.5, avg: 1 }],
    total: 3,
    avg: 1.5,
    isQuotaExceeded: false,
  },
};

describe('AIGatewayTelemetryClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayTelemetryClient;

  beforeEach(() => {
    client = new AIGatewayTelemetryClient({
      baseUrl: 'https://gw.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
      tsgId: '1852583913',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GETs logs/charts/cost with all four window params', async () => {
    mockFetch(costBody);
    const res = await client.cost({ workspaceSlug: 'ws-x' });

    expect(res.data.total).toBe(3);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe('/logs/charts/cost');
    expect(u.searchParams.get('organisationId')).toBe('1852583913');
    expect(u.searchParams.get('workspaceSlug')).toBe('ws-x');
    expect(u.searchParams.get('timeOfGenerationMin')).toBeTruthy();
    expect(u.searchParams.get('timeOfGenerationMax')).toBeTruthy();
  });

  it('percent-encodes the + in the timezone offset', async () => {
    // Force a positive UTC offset so the '+' path is exercised on any host.
    const spy = vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(-120); // UTC+02:00
    try {
      mockFetch(costBody);
      await client.cost({ workspaceSlug: 'ws-x' });

      const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      // The offset must arrive percent-encoded: a literal '+' decodes to a space and 400s.
      expect(url as string).toContain('%2B02%3A00');
      expect(url as string).not.toMatch(/timeOfGenerationMin=[^&]*\+/);
    } finally {
      spy.mockRestore();
    }
  });

  it('routes each chart method to its own bespoke slug', async () => {
    const cases: [keyof AIGatewayTelemetryClient, string, unknown][] = [
      [
        'userTrends',
        '/logs/charts/user-trends',
        {
          success: true,
          data: { summary: { total: 1, unique: 1, avg: 1 }, trend: [], isQuotaExceeded: false },
        },
      ],
      [
        'errorTrends',
        '/logs/charts/error-trends',
        {
          success: true,
          data: { summary: { errorPercent: 0 }, trend: [], isQuotaExceeded: false },
        },
      ],
      [
        'cacheSummary',
        '/logs/charts/cache-summary',
        {
          success: true,
          data: {
            summary: { cacheHits: 0, avgCacheLatency: null, totalRequests: 1, cacheSpeedup: 0 },
            isQuotaExceeded: false,
          },
        },
      ],
    ];

    for (const [method, path, body] of cases) {
      mockFetch(body);
      await (client[method] as (o: { workspaceSlug: string }) => Promise<unknown>)({
        workspaceSlug: 'ws-x',
      });
      const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
      const u = new URL(calls[calls.length - 1][0] as string);
      expect(u.pathname).toBe(path);
    }
  });

  // Chart slugs are bespoke and unguessable (see constants.ts AI_GW_CHART_METRICS) — a typo
  // in any one of them ships as a silent runtime 404. This table drives every chart method
  // plus byStatusCode through a minimal-but-valid response body for its schema and asserts
  // the exact request path, so a slug regression fails here by name instead of in prod.
  const allChartCases: [string, string, unknown][] = [
    [
      'cost',
      '/logs/charts/cost',
      { data: { records: [], total: 0, avg: 0, isQuotaExceeded: false } },
    ],
    [
      'requests',
      '/logs/charts/requests',
      { data: { records: [], total: 0, isQuotaExceeded: false } },
    ],
    [
      'latency',
      '/logs/charts/latency',
      { data: { records: [], total: 0, p50: 0, p90: 0, p99: 0, isQuotaExceeded: false } },
    ],
    [
      'tokens',
      '/logs/charts/tokens',
      {
        data: {
          records: [],
          total: 0,
          avg: 0,
          total_request_units: 0,
          total_response_units: 0,
          isQuotaExceeded: false,
        },
      },
    ],
    ['errors', '/logs/charts/errors', { data: { records: [], total: 0, isQuotaExceeded: false } }],
    ['users', '/logs/charts/users', { data: { records: [], total: 0, isQuotaExceeded: false } }],
    [
      'cacheSummary',
      '/logs/charts/cache-summary',
      {
        data: {
          summary: { cacheHits: 0, avgCacheLatency: null, totalRequests: 0, cacheSpeedup: 0 },
          isQuotaExceeded: false,
        },
      },
    ],
    [
      'cacheHitTrend',
      '/logs/charts/cache-hit-trend',
      {
        data: {
          trend: [],
          total: 0,
          summary: { totalCacheHits: 0, hitRate: 0 },
          isQuotaExceeded: false,
        },
      },
    ],
    [
      'userTrends',
      '/logs/charts/user-trends',
      { data: { summary: { total: 0, unique: 0, avg: 0 }, trend: [], isQuotaExceeded: false } },
    ],
    [
      'errorTrends',
      '/logs/charts/error-trends',
      { data: { summary: { errorPercent: 0 }, trend: [], isQuotaExceeded: false } },
    ],
    [
      'rescuedRetries',
      '/logs/charts/rescued-retries',
      {
        data: {
          trend: [],
          total: 0,
          trends: [],
          retryTotal: 0,
          fallbackTotal: 0,
          isQuotaExceeded: false,
        },
      },
    ],
    [
      'feedbackTrend',
      '/logs/charts/feedback-trend',
      { data: { records: [], total: 0, isQuotaExceeded: false } },
    ],
    [
      'feedbackWeighted',
      '/logs/charts/feedback-weighted',
      { data: { records: [], total: 0, isQuotaExceeded: false } },
    ],
    [
      'feedbackScoreDistribution',
      '/logs/charts/feedback-score-distribution',
      { data: { records: [], total: 0, isQuotaExceeded: false } },
    ],
    [
      'feedbackModels',
      '/logs/charts/feedback-models',
      { data: { records: [], isQuotaExceeded: false } },
    ],
  ];

  it.each(allChartCases)('%s routes to the exact chart path %s', async (method, path, data) => {
    mockFetch({ success: true, ...(data as object) });
    await (
      client[method as keyof AIGatewayTelemetryClient] as (o: {
        workspaceSlug: string;
      }) => Promise<unknown>
    )({ workspaceSlug: 'ws-x' });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname, `${method} routed to the wrong path`).toBe(path);
  });

  it('byStatusCode routes to /logs/groups/status_code', async () => {
    mockFetch({
      object: 'list',
      is_quota_exceeded: false,
      total: 0,
      data: [],
    });
    await client.byStatusCode({ workspaceSlug: 'ws-x' });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/logs/groups/status_code');
  });
});

describe('AIGatewayTelemetryClient groups and logs', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayTelemetryClient;

  beforeEach(() => {
    client = new AIGatewayTelemetryClient({
      baseUrl: 'https://gw.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
      tsgId: '1852583913',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('joins columns with commas on groupBy', async () => {
    mockFetch({
      object: 'list',
      is_quota_exceeded: false,
      total: 1,
      data: [{ model: 'm', requests: 1, object: 'log' }],
    });
    await client.groupBy('model', { workspaceSlug: 'ws-x', columns: ['cost', 'total_tokens'] });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe('/logs/groups/model');
    expect(u.searchParams.get('columns')).toBe('cost,total_tokens');
  });

  it('byUser uses the plural path and the OTHER envelope', async () => {
    mockFetch({
      success: true,
      data: { records: [{ _user: '', count: 2, cost: 1 }], total: 1, isQuotaExceeded: false },
    });
    const res = await client.byUser({ workspaceSlug: 'ws-x' });

    expect(res.data.records[0].count).toBe(2);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(new URL(url as string).pathname).toBe('/logs/groups/users');
  });

  it('logs() hits the BARE path and passes pageSize/statusCode', async () => {
    mockFetch({
      success: true,
      data: { records: [], total: 0, capturedTotal: 0, isQuotaExceeded: false },
    });
    await client.logs({ workspaceSlug: 'ws-x', pageSize: 25, statusCode: 446 });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.pathname).toBe('/logs');
    expect(u.searchParams.get('pageSize')).toBe('25');
    expect(u.searchParams.get('statusCode')).toBe('446');
  });

  it('omits log filters that were not supplied', async () => {
    mockFetch({
      success: true,
      data: { records: [], total: 0, capturedTotal: 0, isQuotaExceeded: false },
    });
    await client.logs({ workspaceSlug: 'ws-x' });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const u = new URL(url as string);
    expect(u.searchParams.has('statusCode')).toBe(false);
    expect(u.searchParams.has('traceId')).toBe(false);
  });
});
