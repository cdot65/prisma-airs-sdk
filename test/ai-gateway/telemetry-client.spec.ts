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
    mockFetch(costBody);
    await client.cost({ workspaceSlug: 'ws-x' });
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url as string).not.toMatch(/timeOfGenerationMin=[^&]*\+/);
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
});
