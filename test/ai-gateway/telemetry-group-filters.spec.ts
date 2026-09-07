import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AIGatewayTelemetryClient,
  type AIGatewayGroupOptions,
} from '../../src/ai-gateway/telemetry-client.js';
import { ErrorType } from '../../src/errors.js';
import type { AuthAdapter } from '../../src/http/types.js';

const firstKey = '11111111-1111-4111-8111-111111111111';
const secondKey = '22222222-2222-4222-8222-222222222222';
const dimensions = ['ai_service', 'model', 'api_key', 'provider', 'status_code', 'users'] as const;

describe.each(dimensions)('%s grouped analytics filters', (dimension) => {
  const originalFetch = globalThis.fetch;
  const prepare = vi.fn<AuthAdapter['prepare']>(async (request) => request);
  let client: AIGatewayTelemetryClient;
  const response =
    dimension === 'users'
      ? { success: true, data: { records: [], total: 0, isQuotaExceeded: false } }
      : { object: 'list', is_quota_exceeded: false, total: 0, data: [] };
  beforeEach(() => {
    prepare.mockClear();
    globalThis.fetch = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify(response)));
    client = new AIGatewayTelemetryClient({
      baseUrl: 'https://scm.example.invalid',
      tsgId: '1234',
      numRetries: 0,
      auth: { prepare },
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  const query = (options: AIGatewayGroupOptions) =>
    dimension === 'users'
      ? client.byUser(options)
      : dimension === 'status_code'
        ? client.byStatusCode(options)
        : client.groupBy(dimension, options);
  const url = () => new URL(String(vi.mocked(globalThis.fetch).mock.calls[0][0]));

  it('combines every verified filter, preserves columns and uses exact SCM wire names', async () => {
    const options = {
      workspaceSlug: 'ws-dev',
      start: new Date('2026-09-06T00:00:00Z'),
      end: new Date('2026-09-07T00:00:00Z'),
      traceId: 'owned+a&b',
      metadata: { purpose: 'owned+a&b="quoted"' },
      statusCodes: [418, 200],
      apiKeyIds: [firstKey, secondKey],
      aiOrgModels: ['openai__model+a&b', 'azure-openai__deployment'],
      totalUnitsMin: 0,
      totalUnitsMax: 42,
      costMin: 0,
      costMax: 0.125,
      ...(dimension === 'users' ? {} : { columns: ['cost', 'total_tokens'] as const }),
    };
    const before = structuredClone(options);
    await expect(query(options as never)).resolves.toEqual(response);
    const actual = url();
    expect(actual.origin).toBe('https://scm.example.invalid');
    expect(actual.pathname).toBe(`/logs/groups/${dimension}`);
    expect(Object.fromEntries(actual.searchParams)).toEqual({
      organisationId: '1234',
      workspaceSlug: 'ws-dev',
      timeOfGenerationMin: expect.stringMatching(/T.*[+-]\d\d:\d\d$/),
      timeOfGenerationMax: expect.stringMatching(/T.*[+-]\d\d:\d\d$/),
      traceId: 'owned+a&b',
      metadata: JSON.stringify(options.metadata),
      statusCode: '418,200',
      apiKeyIds: `${firstKey},${secondKey}`,
      aiOrgModel: 'openai__model+a&b,azure-openai__deployment',
      totalUnitsMin: '0',
      totalUnitsMax: '42',
      costMin: '0',
      costMax: '0.125',
      ...(dimension === 'users' ? {} : { columns: 'cost,total_tokens' }),
    });
    expect(new Date(actual.searchParams.get('timeOfGenerationMin')!)).toEqual(options.start);
    expect(new Date(actual.searchParams.get('timeOfGenerationMax')!)).toEqual(options.end);
    expect(vi.mocked(globalThis.fetch).mock.calls[0][1]?.method).toBe('GET');
    expect(options).toEqual(before);
    expect(prepare).toHaveBeenCalledOnce();
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it.each([
    ['traceId', 'owned', 'traceId', 'owned'],
    ['metadata', {}, 'metadata', '{}'],
    ['statusCodes', [0], 'statusCode', '0'],
    ['apiKeyIds', [firstKey], 'apiKeyIds', firstKey],
    ['aiOrgModels', ['openai__model'], 'aiOrgModel', 'openai__model'],
    ['totalUnitsMin', 0, 'totalUnitsMin', '0'],
    ['totalUnitsMax', 0, 'totalUnitsMax', '0'],
    ['costMin', 0, 'costMin', '0'],
    ['costMax', 0, 'costMax', '0'],
  ])('preserves standalone %s including zero', async (key, value, wire, expected) => {
    await query({ workspaceSlug: 'ws-dev', [String(key)]: value });
    expect(url().searchParams.get(String(wire))).toBe(expected);
  });

  it('accepts equal bounds without rounding fractional cents', async () => {
    await query({
      workspaceSlug: 'ws-dev',
      totalUnitsMin: 3,
      totalUnitsMax: 3,
      costMin: 0.000125,
      costMax: 0.000125,
    } as never);
    expect(url().searchParams.get('totalUnitsMin')).toBe('3');
    expect(url().searchParams.get('totalUnitsMax')).toBe('3');
    expect(url().searchParams.get('costMin')).toBe('0.000125');
    expect(url().searchParams.get('costMax')).toBe('0.000125');
  });

  it('does not inject undefined filters or empty columns', async () => {
    await query({
      workspaceSlug: 'ws-dev',
      traceId: undefined,
      metadata: undefined,
      statusCodes: undefined,
      apiKeyIds: undefined,
      aiOrgModels: undefined,
      totalUnitsMin: undefined,
      totalUnitsMax: undefined,
      costMin: undefined,
      costMax: undefined,
      ...(dimension === 'users' ? {} : { columns: [] }),
    } as never);
    expect([...url().searchParams.keys()].sort()).toEqual([
      'organisationId',
      'timeOfGenerationMax',
      'timeOfGenerationMin',
      'workspaceSlug',
    ]);
  });

  it.each([
    ['traceId', ''],
    ['traceId', ' '],
    ['traceId', null],
    ['metadata', null],
    ['metadata', []],
    ['metadata', { nested: {} }],
    ['metadata', { count: 1 }],
    ['metadata', JSON.parse('{"__proto__":"unsafe"}')],
    ['metadata', { constructor: 'unsafe' }],
    ['statusCodes', []],
    ['statusCodes', '200'],
    ['statusCodes', [200.5]],
    ['statusCodes', [-1]],
    ['statusCodes', [Infinity]],
    ['apiKeyIds', []],
    ['apiKeyIds', ['not-a-uuid']],
    ['apiKeyIds', firstKey],
    ['aiOrgModels', []],
    ['aiOrgModels', ['model']],
    ['aiOrgModels', ['openai__']],
    ['aiOrgModels', ['openai__model,other__model']],
    ['totalUnitsMin', -1],
    ['totalUnitsMax', 0.5],
    ['totalUnitsMax', Number.MAX_SAFE_INTEGER + 1],
    ['totalUnitsMin', '1'],
    ['totalUnitsMin', NaN],
    ['costMin', -0.1],
    ['costMax', Infinity],
    ['costMax', '1'],
    ['columns', ['unknown']],
    ['columns', 'cost'],
    ['trace_id', 'ignored'],
    ['statusCode', 200],
    ['cost_min', 0],
    ['pageSize', 1],
  ])('rejects invalid or unverified %s before authentication', async (key, value) => {
    await expect(query({ workspaceSlug: 'ws-dev', [String(key)]: value })).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it.each([
    { totalUnitsMin: 2, totalUnitsMax: 1 },
    { costMin: 0.126, costMax: 0.125 },
  ])('rejects reversed bounds before authentication', async (bounds) => {
    await expect(query({ workspaceSlug: 'ws-dev', ...bounds })).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  if (dimension === 'users') {
    it('does not infer column support for the distinct user envelope', async () => {
      await expect(query({ workspaceSlug: 'ws-dev', columns: ['cost'] })).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(prepare).not.toHaveBeenCalled();
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  }
});
