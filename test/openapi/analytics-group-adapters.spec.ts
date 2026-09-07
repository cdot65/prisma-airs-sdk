import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayTelemetryClient } from '../../src/ai-gateway/telemetry-client.js';
import fixture from './analytics-group-adapters.json';
import manifest from './gateway-manifest.json';

describe('source-derived grouped analytics partial adapters', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('preserves the source denominator, declarations and SCM-only extension separately', () => {
    expect(fixture.sha256).toBe(manifest.sha256);
    expect(fixture.classification).toBe('scm-adapted-partial');
    expect(fixture.operations).toHaveLength(3);
    for (const operation of fixture.operations) {
      expect(
        manifest.operations.find((item) => item.path === operation.upstreamPath),
      ).toMatchObject({
        status: fixture.classification,
      });
      expect(operation.filters.map((item) => item.name).sort()).toEqual([
        'ai_org_model',
        'api_key_ids',
        'cost_max',
        'cost_min',
        'metadata',
        'status_code',
        'total_units_max',
        'total_units_min',
        ...(operation.metric === 'provider' ? [] : ['trace_id']),
      ]);
      expect(operation.scmOnlyFilters).toEqual(operation.metric === 'provider' ? ['traceId'] : []);
      expect(operation.declaredQueryNames.includes('trace_id')).toBe(
        operation.metric !== 'provider',
      );
      expect(operation.declaredQueryNames.length).toBeGreaterThan(20);
      for (const filter of operation.filters) {
        if (filter.name.startsWith('total_units_'))
          expect(filter.schema).toEqual({ type: 'integer', minimum: 0 });
        else if (filter.name.startsWith('cost_'))
          expect(filter.schema).toEqual({ type: 'number', minimum: 0 });
        else expect(filter.schema.type).toBe('string');
      }
    }
  });

  it.each(fixture.operations)(
    '$metric uses the verified SCM route, casing and envelope',
    async (operation) => {
      const body =
        operation.metric === 'users'
          ? {
              success: true,
              data: {
                records: [{ _user: '', count: 1, cost: 0.125 }],
                total: 1,
                isQuotaExceeded: false,
              },
            }
          : {
              object: 'list',
              is_quota_exceeded: false,
              total: 1,
              data: [
                {
                  requests: 1,
                  cost: 0.125,
                  object: 'analytics-group',
                  [operation.metric]: 'owned',
                },
              ],
            };
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
      const client = new AIGatewayTelemetryClient({
        baseUrl: 'https://scm.example.invalid',
        tsgId: '1234',
        numRetries: 0,
        auth: { prepare: async (request) => request },
      });
      const options = {
        workspaceSlug: 'ws-dev',
        traceId: 'owned',
        metadata: { sdk_e2e: 'owned' },
        statusCodes: [200, 446],
        apiKeyIds: ['11111111-1111-4111-8111-111111111111'],
        aiOrgModels: ['openai__model'],
        totalUnitsMin: 0,
        totalUnitsMax: 42,
        costMin: 0,
        costMax: 0.125,
      };
      const actual =
        operation.metric === 'users'
          ? await client.byUser(options)
          : await client.groupBy(operation.metric as 'model' | 'provider', options);
      expect(actual).toEqual(body);
      const [input, init] = vi.mocked(globalThis.fetch).mock.calls[0];
      const url = new URL(String(input));
      expect(init?.method).toBe(operation.method);
      expect(url.pathname).toBe(operation.scmPath);
      expect(url.pathname).not.toBe(operation.upstreamPath);
      expect(Object.fromEntries(url.searchParams)).toEqual({
        organisationId: '1234',
        workspaceSlug: 'ws-dev',
        timeOfGenerationMin: expect.stringMatching(/T.*[+-]\d\d:\d\d$/),
        timeOfGenerationMax: expect.stringMatching(/T.*[+-]\d\d:\d\d$/),
        traceId: 'owned',
        metadata: '{"sdk_e2e":"owned"}',
        statusCode: '200,446',
        apiKeyIds: options.apiKeyIds[0],
        aiOrgModel: 'openai__model',
        totalUnitsMin: '0',
        totalUnitsMax: '42',
        costMin: '0',
        costMax: '0.125',
      });
    },
  );
});
