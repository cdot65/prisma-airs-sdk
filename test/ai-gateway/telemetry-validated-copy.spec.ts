import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayTelemetryClient } from '../../src/ai-gateway/telemetry-client.js';

describe('telemetry serializes the validated copy', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  it.each([
    'requests',
    'cost',
    'tokens',
    'latency',
    'model',
    'provider',
    'ai_service',
    'api_key',
    'status_code',
    'users',
    'logs',
  ] as const)('%s reads caller-owned properties only during validation', async (method) => {
    const group = !['requests', 'cost', 'tokens', 'latency', 'users', 'logs'].includes(method);
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify(
          group
            ? { object: 'list', is_quota_exceeded: false, total: 0, data: [] }
            : {
                success: true,
                data: {
                  records: [],
                  total: 0,
                  ...(method === 'logs' ? { capturedTotal: 0 } : {}),
                  avg: 0,
                  p50: 0,
                  p90: 0,
                  p99: 0,
                  total_request_units: 0,
                  total_response_units: 0,
                  isQuotaExceeded: false,
                },
              },
        ),
      ),
    );
    const prepare = vi.fn(async (request) => request);
    const client = new AIGatewayTelemetryClient({
      baseUrl: 'https://scm.example.invalid',
      tsgId: '1234',
      numRetries: 0,
      auth: { prepare },
    });
    const values =
      method === 'logs'
        ? { workspaceSlug: 'ws-dev', traceId: 'validated-trace', pageSize: 20, statusCode: 200 }
        : {
            workspaceSlug: 'ws-dev',
            traceId: 'validated-trace',
            metadata: { purpose: 'owned' },
            statusCodes: [200, 446],
            apiKeyIds: ['11111111-1111-4111-8111-111111111111'],
            aiOrgModels: ['openai__model'],
            totalUnitsMin: 0,
            totalUnitsMax: 42,
            costMin: 0,
            costMax: 0.125,
            ...(group ? { columns: ['cost', 'total_tokens'] } : {}),
          };
    const reads = new Map<string, number>();
    const options = Object.fromEntries(Object.keys(values).map((key) => [key, undefined]));
    for (const [key, value] of Object.entries(values))
      Object.defineProperty(options, key, {
        enumerable: true,
        get() {
          reads.set(key, (reads.get(key) ?? 0) + 1);
          if (reads.get(key)! > 1) throw new Error('Caller-owned property reread after validation');
          return value;
        },
      });
    const result =
      method === 'users'
        ? client.byUser(options as never)
        : method === 'status_code'
          ? client.byStatusCode(options as never)
          : method === 'model' ||
              method === 'provider' ||
              method === 'ai_service' ||
              method === 'api_key'
            ? client.groupBy(method, options as never)
            : client[method](options as never);
    await expect(result).resolves.toBeDefined();
    expect(prepare).toHaveBeenCalledOnce();
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    expect([...reads.values()].every((value) => value === 1)).toBe(true);
    const url = new URL(String(vi.mocked(globalThis.fetch).mock.calls[0][0]));
    expect(url.searchParams.get('traceId')).toBe('validated-trace');
    expect(url.searchParams.get('metadata')).toBe(method === 'logs' ? null : '{"purpose":"owned"}');
    expect(url.searchParams.get('statusCode')).toBe(method === 'logs' ? '200' : '200,446');
    expect(url.searchParams.get('costMax')).toBe(method === 'logs' ? null : '0.125');
    expect(url.searchParams.get('pageSize')).toBe(method === 'logs' ? '20' : null);
    expect(url.searchParams.get('columns')).toBe(group ? 'cost,total_tokens' : null);
  });
});
