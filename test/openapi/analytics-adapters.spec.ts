import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayTelemetryClient } from '../../src/ai-gateway/telemetry-client.js';
import fixture from './analytics-adapters.json';
import manifest from './gateway-manifest.json';

describe('source-derived partial analytics adapters', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  it('keeps SCM adapters outside direct upstream operation coverage', () => {
    expect(fixture.sha256).toBe(manifest.sha256);
    expect(fixture.classification).toBe('scm-adapted-partial');
    expect(fixture.operations).toHaveLength(4);
    for (const operation of fixture.operations) {
      expect(
        manifest.operations.find((item) => item.path === operation.upstreamPath),
      ).toMatchObject({
        status: fixture.classification,
      });
      expect(operation.filters.map((filter) => filter.name).sort()).toEqual([
        'metadata',
        'trace_id',
      ]);
      expect(operation.filters.every((filter) => filter.schema.type === 'string')).toBe(true);
      expect(operation.declaredQueryNames.length).toBeGreaterThan(20);
    }
  });
  it.each(fixture.operations)(
    '$metric sends only the verified SCM query contract',
    async (operation) => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              records: [],
              total: 0,
              avg: 0,
              p50: 0,
              p90: 0,
              p99: 0,
              total_request_units: 0,
              total_response_units: 0,
              isQuotaExceeded: false,
            },
          }),
        ),
      );
      const client = new AIGatewayTelemetryClient({
        baseUrl: 'https://scm.example.invalid',
        tsgId: '1234',
        numRetries: 0,
        auth: { prepare: async (request) => request },
      });
      const metric = operation.metric as 'requests' | 'cost' | 'tokens' | 'latency';
      await client[metric]({
        workspaceSlug: 'ws-dev',
        start: new Date('2026-09-06T00:00:00Z'),
        end: new Date('2026-09-07T00:00:00Z'),
        traceId: 'owned',
        metadata: { sdk_e2e: 'owned' },
      });
      const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];
      const actual = new URL(String(url));
      expect(options?.method).toBe(operation.method);
      expect(actual.pathname).toBe(operation.scmPath);
      expect(actual.pathname).not.toBe(operation.upstreamPath);
      expect(Object.fromEntries(actual.searchParams)).toEqual({
        organisationId: '1234',
        workspaceSlug: 'ws-dev',
        timeOfGenerationMin: expect.stringMatching(/T.*[+-]\d\d:\d\d$/),
        timeOfGenerationMax: expect.stringMatching(/T.*[+-]\d\d:\d\d$/),
        traceId: 'owned',
        metadata: '{"sdk_e2e":"owned"}',
      });
      expect(new Date(actual.searchParams.get('timeOfGenerationMin')!).toISOString()).toBe(
        '2026-09-06T00:00:00.000Z',
      );
      expect(new Date(actual.searchParams.get('timeOfGenerationMax')!).toISOString()).toBe(
        '2026-09-07T00:00:00.000Z',
      );
    },
  );
});
