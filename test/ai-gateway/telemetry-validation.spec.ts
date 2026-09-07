import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayTelemetryClient } from '../../src/ai-gateway/telemetry-client.js';
import { serializeWindow, toOffsetIso } from '../../src/ai-gateway/window.js';
import { AISecSDKException, ErrorType } from '../../src/errors.js';
import type { AuthAdapter } from '../../src/http/types.js';

describe('telemetry rejects invalid options before authentication or network I/O', () => {
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
  async function rejected(action: () => Promise<unknown>) {
    await expect(action()).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  }
  const badWindows: [string, unknown][] = [
    ['missing options', undefined],
    ['null options', null],
    ['missing workspace', {}],
    ['empty workspace', { workspaceSlug: '' }],
    ['blank workspace', { workspaceSlug: '  ' }],
    ['non-string workspace', { workspaceSlug: 12 }],
    ['malformed workspace', { workspaceSlug: '../other' }],
    ['NaN days', { workspaceSlug: 'ws-dev', days: NaN }],
    ['infinite days', { workspaceSlug: 'ws-dev', days: Infinity }],
    ['negative days', { workspaceSlug: 'ws-dev', days: -1 }],
    ['overflowed days', { workspaceSlug: 'ws-dev', days: Number.MAX_VALUE }],
    ['string days', { workspaceSlug: 'ws-dev', days: '7' }],
    ['invalid start', { workspaceSlug: 'ws-dev', start: new Date(NaN) }],
    ['invalid end', { workspaceSlug: 'ws-dev', end: new Date(NaN) }],
    ['string start', { workspaceSlug: 'ws-dev', start: '2026-09-01' }],
    ['string end', { workspaceSlug: 'ws-dev', end: '2026-09-01' }],
    [
      'reverse window',
      { workspaceSlug: 'ws-dev', start: new Date('2026-09-06'), end: new Date('2026-09-05') },
    ],
    ['unsupported year', { workspaceSlug: 'ws-dev', start: new Date('-000001-01-01T00:00:00Z') }],
    ['unknown option', { workspaceSlug: 'ws-dev', unsupported: true }],
  ];
  it.each(badWindows)('%s is rejected', async (_name, options) => {
    await rejected(() => client.cost(options as never));
  });
  it.each(['../configs', '../../providers', 'model/../users', 'model?scope=all', '', null])(
    'rejects grouping dimension %s',
    async (dimension) => {
      await rejected(() => client.groupBy(dimension as never, { workspaceSlug: 'ws-dev' }));
    },
  );
  it.each(
    [['bogus'], ['cost', 'bogus'], ['cost,avg_latency'], 'cost', [1], null].map((columns) => [
      columns,
    ]),
  )('rejects unsupported group columns %j', async (columns) => {
    await rejected(() => client.groupBy('model', { workspaceSlug: 'ws-dev', columns } as never));
  });
  it('validates byStatusCode columns too', async () => {
    await rejected(() =>
      client.byStatusCode({ workspaceSlug: 'ws-dev', columns: ['unknown'] } as never),
    );
  });
  it('serializes verified request-chart trace filtering with SCM casing', async () => {
    await client.requests({ workspaceSlug: 'ws-dev', traceId: 'owned-trace' } as never);
    const url = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
    expect(url.searchParams.get('traceId')).toBe('owned-trace');
    expect(url.searchParams.has('trace_id')).toBe(false);
  });
  it('JSON-encodes request-chart metadata without changing its values', async () => {
    const metadata = { sdk_e2e: 'owned-value', punctuation: 'a+b&c="quoted",d' };
    await client.requests({ workspaceSlug: 'ws-dev', metadata } as never);
    const url = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
    expect(JSON.parse(url.searchParams.get('metadata')!)).toEqual(metadata);
  });
  it.each(
    [
      null,
      [],
      { count: 1 },
      { nested: { key: 'value' } },
      JSON.parse('{"__proto__":"unsafe"}'),
      { constructor: 'unsafe' },
    ].map((metadata) => [metadata]),
  )('rejects invalid metadata %j', async (metadata) => {
    await rejected(() => client.requests({ workspaceSlug: 'ws-dev', metadata } as never));
  });
  it('rejects an empty request-chart trace filter', async () => {
    await rejected(() => client.requests({ workspaceSlug: 'ws-dev', traceId: '' } as never));
  });
  it('does not imply verified filtering on other charts', async () => {
    await rejected(() =>
      client.errors({ workspaceSlug: 'ws-dev', traceId: 'owned-trace' } as never),
    );
  });
  describe.each(['requests', 'cost', 'tokens', 'latency'] as const)(
    '%s verified chart filters',
    (method) => {
      it('serializes both filters together without changing values or casing', async () => {
        const metadata = { sdk_e2e: 'owned', punctuation: 'a+b&c="quoted",d' };
        await client[method]({ workspaceSlug: 'ws-dev', traceId: 'trace+a&b', metadata } as never);
        const url = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
        expect(url.pathname).toBe(`/logs/charts/${method}`);
        expect(url.searchParams.get('traceId')).toBe('trace+a&b');
        expect(url.searchParams.has('trace_id')).toBe(false);
        expect(JSON.parse(url.searchParams.get('metadata')!)).toEqual(metadata);
      });
      it('omits filters when undefined', async () => {
        await client[method]({
          workspaceSlug: 'ws-dev',
          traceId: undefined,
          metadata: undefined,
        } as never);
        const url = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
        expect([...url.searchParams.keys()].sort()).toEqual([
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
        ['traceId', 123],
        ['metadata', null],
        ['metadata', []],
        ['metadata', { count: 1 }],
        ['metadata', { nested: { key: 'value' } }],
        ['metadata', { constructor: 'unsafe' }],
        ['metadata', JSON.parse('{"__proto__":"unsafe"}')],
        ['trace_id', 'ignored'],
        ['cost_min', 0],
        ['statusCode', 200],
        ['pageSize', 1],
      ])('rejects invalid or unverified %s=%j before I/O', async (key, value) => {
        await rejected(() =>
          client[method]({ workspaceSlug: 'ws-dev', [String(key)]: value } as never),
        );
      });
    },
  );
  it.each([
    ['pageSize', -1],
    ['pageSize', 1.5],
    ['pageSize', Infinity],
    ['pageSize', NaN],
    ['pageSize', Number.MAX_SAFE_INTEGER + 1],
    ['pageSize', '20'],
    ['statusCode', -1],
    ['statusCode', 200.5],
    ['statusCode', Infinity],
    ['statusCode', '200'],
    ['traceId', ''],
    ['traceId', ' '],
    ['traceId', 123],
    ['columns', ['cost']],
    ['unsupported', 'private-value-do-not-log'],
  ])('rejects invalid log option %s=%j', async (name, value) => {
    await rejected(() => client.logs({ workspaceSlug: 'ws-dev', [String(name)]: value } as never));
  });
  it('rejects invalid byUser windows', async () => {
    await rejected(() => client.byUser({ workspaceSlug: 'ws-dev', start: new Date(NaN) }));
  });
  it('omits rejected input values from its error', async () => {
    await expect(
      client.cost({ workspaceSlug: 'private-value-do-not-log/invalid' }),
    ).rejects.not.toHaveProperty('message', expect.stringContaining('private-value-do-not-log'));
    expect(prepare).not.toHaveBeenCalled();
  });
  it('allows fractional rolling windows without changing offset serialization', async () => {
    const end = new Date('2026-09-06T12:00:00Z');
    await client.cost({ workspaceSlug: 'ws-dev', days: 0.5, end });
    const url = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
    expect(
      Date.parse(url.searchParams.get('timeOfGenerationMax')!) -
        Date.parse(url.searchParams.get('timeOfGenerationMin')!),
    ).toBe(43_200_000);
  });
});

describe('window serialization boundaries', () => {
  it.each([
    new Date(NaN),
    new Date('-000001-01-01T00:00:00Z'),
    new Date('+010000-01-01T00:00:00Z'),
  ])('rejects dates outside four-digit ISO serialization', (date) => {
    expect(() => toOffsetIso(date)).toThrow(AISecSDKException);
  });
  it('pads a valid early year to four digits', () => {
    const date = new Date(0);
    date.setFullYear(42, 5, 1);
    expect(toOffsetIso(date)).toMatch(/^0042-06-01T/);
  });
  it('retains an explicit window even when finite days would be ignored', () => {
    const start = new Date('2026-09-05T00:00:00Z'),
      end = new Date('2026-09-06T00:00:00Z');
    const result = serializeWindow('1234', { workspaceSlug: 'ws-dev', start, end, days: -1 });
    expect(Date.parse(result.timeOfGenerationMin)).toBe(start.getTime());
    expect(Date.parse(result.timeOfGenerationMax)).toBe(end.getTime());
  });
  it('allows a zero-length explicit window', () => {
    const date = new Date('2026-09-06T00:00:00Z');
    const result = serializeWindow('1234', { workspaceSlug: 'ws-dev', start: date, end: date });
    expect(result.timeOfGenerationMin).toBe(result.timeOfGenerationMax);
  });
});
