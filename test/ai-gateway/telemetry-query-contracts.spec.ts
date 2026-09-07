import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayTelemetryClient } from '../../src/ai-gateway/telemetry-client.js';
import { ErrorType } from '../../src/errors.js';
import type { AuthAdapter } from '../../src/http/types.js';

const keyId = '11111111-1111-4111-8111-111111111111';
const anotherKeyId = '22222222-2222-4222-8222-222222222222';

describe.each(['requests', 'cost', 'tokens', 'latency'] as const)(
  '%s scalar and CSV query contracts',
  (method) => {
    const originalFetch = globalThis.fetch;
    const prepare = vi.fn<AuthAdapter['prepare']>(async (request) => request);
    let client: AIGatewayTelemetryClient;
    beforeEach(() => {
      prepare.mockClear();
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              records: [],
              total: 0,
              avg: 0,
              isQuotaExceeded: false,
              p50: 0,
              p90: 0,
              p99: 0,
              total_request_units: 0,
              total_response_units: 0,
            },
          }),
        ),
      );
      client = new AIGatewayTelemetryClient({
        baseUrl: 'https://gateway.example.invalid',
        tsgId: '1234',
        numRetries: 0,
        auth: { prepare },
      });
    });
    afterEach(() => {
      globalThis.fetch = originalFetch;
    });
    const url = () => new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
    async function rejected(options: unknown) {
      await expect(client[method](options as never)).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(prepare).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    }

    it('serializes verified scalar, list, trace and metadata filters together without mutation', async () => {
      const options = {
        workspaceSlug: 'ws-dev',
        days: 1,
        traceId: 'trace+a&b',
        metadata: { environment: 'a+b&c' },
        statusCodes: [418, 200],
        apiKeyIds: [keyId, anotherKeyId],
        aiOrgModels: ['openai__model+a&b', 'azure-openai__deployment'],
        totalUnitsMin: 0,
        totalUnitsMax: 42,
        costMin: 0,
        costMax: 0.125,
      };
      const before = structuredClone(options);
      await client[method](options);
      expect(url().pathname).toBe(`/logs/charts/${method}`);
      expect(url().searchParams.get('statusCode')).toBe('418,200');
      expect(url().searchParams.get('apiKeyIds')).toBe(`${keyId},${anotherKeyId}`);
      expect(url().searchParams.get('aiOrgModel')).toBe(
        'openai__model+a&b,azure-openai__deployment',
      );
      expect(url().searchParams.get('totalUnitsMin')).toBe('0');
      expect(url().searchParams.get('totalUnitsMax')).toBe('42');
      expect(url().searchParams.get('costMin')).toBe('0');
      expect(url().searchParams.get('costMax')).toBe('0.125');
      expect(url().searchParams.get('traceId')).toBe('trace+a&b');
      expect(JSON.parse(url().searchParams.get('metadata')!)).toEqual(options.metadata);
      for (const upstream of [
        'status_code',
        'api_key_ids',
        'ai_org_model',
        'total_units_min',
        'total_units_max',
        'cost_min',
        'cost_max',
      ])
        expect(url().searchParams.has(upstream)).toBe(false);
      expect(options).toEqual(before);
      expect(prepare).toHaveBeenCalledOnce();
      expect(globalThis.fetch).toHaveBeenCalledOnce();
    });

    it.each([
      ['statusCodes', [200], 'statusCode', '200'],
      ['apiKeyIds', [keyId], 'apiKeyIds', keyId],
      ['aiOrgModels', ['openai__model'], 'aiOrgModel', 'openai__model'],
      ['totalUnitsMin', 0, 'totalUnitsMin', '0'],
      ['totalUnitsMax', 0, 'totalUnitsMax', '0'],
      ['costMin', 0, 'costMin', '0'],
      ['costMax', 0, 'costMax', '0'],
    ])('preserves a standalone %s including zero', async (key, value, wire, expected) => {
      await client[method]({ workspaceSlug: 'ws-dev', [String(key)]: value });
      expect(url().searchParams.get(String(wire))).toBe(expected);
    });

    it('omits every undefined filter', async () => {
      const options = {
        workspaceSlug: 'ws-dev',
        statusCodes: undefined,
        apiKeyIds: undefined,
        aiOrgModels: undefined,
        totalUnitsMin: undefined,
        totalUnitsMax: undefined,
        costMin: undefined,
        costMax: undefined,
      };
      await client[method](options);
      expect([...url().searchParams.keys()].sort()).toEqual([
        'organisationId',
        'timeOfGenerationMax',
        'timeOfGenerationMin',
        'workspaceSlug',
      ]);
    });

    it('accepts equal inclusive bounds and fractional cent values', async () => {
      const options = {
        workspaceSlug: 'ws-dev',
        totalUnitsMin: 3,
        totalUnitsMax: 3,
        costMin: 0.000125,
        costMax: 0.000125,
      };
      await client[method](options);
      expect(url().searchParams.get('totalUnitsMin')).toBe(url().searchParams.get('totalUnitsMax'));
      expect(url().searchParams.get('costMin')).toBe('0.000125');
      expect(url().searchParams.get('costMax')).toBe('0.000125');
    });

    it.each([
      ['statusCodes', []],
      ['statusCodes', null],
      ['statusCodes', '200'],
      ['statusCodes', ['200']],
      ['statusCodes', [200.5]],
      ['statusCodes', [-1]],
      ['statusCodes', [NaN]],
      ['statusCodes', [Infinity]],
      ['statusCodes', [Number.MAX_SAFE_INTEGER + 1]],
      ['apiKeyIds', []],
      ['apiKeyIds', null],
      ['apiKeyIds', keyId],
      ['apiKeyIds', ['not-a-uuid']],
      ['apiKeyIds', [keyId, 1]],
      ['apiKeyIds', [`${keyId},${anotherKeyId}`]],
      ['aiOrgModels', []],
      ['aiOrgModels', null],
      ['aiOrgModels', 'openai__model'],
      ['aiOrgModels', ['']],
      ['aiOrgModels', [' ']],
      ['aiOrgModels', [1]],
      ['aiOrgModels', ['openai__model,azure__model']],
      ['aiOrgModels', ['model-without-provider']],
      ['aiOrgModels', ['__model']],
      ['aiOrgModels', ['openai__']],
      ['totalUnitsMin', -1],
      ['totalUnitsMax', -1],
      ['totalUnitsMin', 1.5],
      ['totalUnitsMax', 1.5],
      ['totalUnitsMin', NaN],
      ['totalUnitsMax', Infinity],
      ['totalUnitsMax', Number.MAX_SAFE_INTEGER + 1],
      ['totalUnitsMin', '1'],
      ['totalUnitsMax', null],
      ['costMin', -0.1],
      ['costMax', -0.1],
      ['costMin', NaN],
      ['costMax', Infinity],
      ['costMin', '0'],
      ['costMax', null],
      ['statusCode', 200],
      ['aiOrgModel', 'openai__model'],
      ['status_code', '200'],
      ['promptTokenMin', 0],
      ['promptTokenMax', 1],
      ['completionTokenMin', 0],
      ['completionTokenMax', 1],
      ['virtualKeys', ['unverified']],
      ['configs', ['unverified']],
    ])('rejects invalid or unverified %s=%j before authentication', async (key, value) => {
      await rejected({ workspaceSlug: 'ws-dev', [String(key)]: value });
    });

    it.each([
      { totalUnitsMin: 2, totalUnitsMax: 1 },
      { costMin: 0.2, costMax: 0.1 },
    ])('rejects reversed inclusive ranges %j before authentication', async (bounds) => {
      await rejected({ workspaceSlug: 'ws-dev', ...bounds });
    });

    it('omits invalid filter values from the error message', async () => {
      await expect(
        client[method]({ workspaceSlug: 'ws-dev', apiKeyIds: ['private-invalid-value'] } as never),
      ).rejects.not.toHaveProperty('message', expect.stringContaining('private-invalid-value'));
      expect(prepare).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  },
);
