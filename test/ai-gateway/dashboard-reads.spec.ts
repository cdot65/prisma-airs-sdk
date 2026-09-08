import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayClient } from '../../src/ai-gateway/client.js';
import { AIGatewayTelemetryClient } from '../../src/ai-gateway/telemetry-client.js';
import { AIGatewayGuardrailsClient } from '../../src/ai-gateway/guardrails-client.js';
import { AIGatewayOrganisationsClient } from '../../src/ai-gateway/organisations-client.js';
import {
  ErrorCategoryTrendsResponseSchema,
  GroupedErrorsResponseSchema,
  GatewayFilterBoundariesResponseSchema,
  GatewayGuardrailCatalogResponseSchema,
} from '../../src/models/ai-gateway-dashboard.js';
import {
  CountChartResponseSchema,
  TokensChartResponseSchema,
} from '../../src/models/ai-gateway.js';
import { redactAIGatewaySecrets } from '../../src/ai-gateway/secret-fields.js';
import { ErrorType } from '../../src/errors.js';

const window = {
  workspaceSlug: 'ws-dev',
  start: new Date('2026-09-05T05:00:00Z'),
  end: new Date('2026-09-08T00:15:36Z'),
};
const category = { response_status_code: 429, count: 2, future: true };
const categories = {
  success: true,
  data: {
    summary: { totalErrors: 2, totalUniqueErrorCodes: 1 },
    trend: [category],
    isQuotaExceeded: false,
  },
};
const grouped = {
  success: true,
  data: {
    trend: [
      { x: '2026-09-07', y: [category] },
      { x: '2026-09-08', y: [] },
    ],
    total: 2,
    isQuotaExceeded: false,
  },
};
const boundaries = {
  success: true,
  data: {
    total_units_max: null,
    total_units_min: null,
    cost_max: null,
    cost_min: null,
    unique_ai_models: [],
    unique_status_codes: [],
    unique_environments: [],
    unique_prompt_ids: [],
    unique_virtual_keys: [],
    unique_configs: [],
    unique_api_keys: [],
    unique_metadata_keys: [],
    isQuotaExceeded: false,
  },
};
const catalog = {
  object: 'list',
  evals: [
    {
      id: 'example',
      name: 'Example',
      type: 'custom',
      guardrailCategory: 'test',
      description: [],
      parameters: {
        type: 'object',
        properties: { nested: { oneOf: [{ type: 'string' }, { type: 'number' }] } },
      },
      deny: false,
    },
  ],
};
const info = {
  id: '123',
  name: 'Example',
  object: 'organisation',
  created_at: '2026-09-07',
  last_updated_at: '2026-09-07',
  is_first_generation_done: 1,
  disable_portkey_gateway: 0,
  settings: {
    dashboard_gateway_url: 'https://gateway.example',
    dashboard_mcp_gateway_url: '',
    debug_log: 0,
    user_api_key_count: 1,
    user_api_key_ttl: 0,
    user_api_key_max_ttl: 0,
    user_key_metadata: 0,
    user_key_metadata_override: 0,
    user_api_key_rotation_period: null,
    user_api_key_auto_create: false,
    default_workspace_user_api_key_auto_create: false,
  },
  benefits: {
    limits: { maxWorkspaces: 0 },
    featureFlags: { allowedGuardrails: ['example'], guardrails: 1 },
  },
  subscription: { type: 'example', name: 'Example' },
};

describe('SCM dashboard reads', () => {
  const fetch = vi.fn();
  const prepare = vi.fn(async (req) => req);
  const opts = { baseUrl: 'https://data.example/v2', auth: { prepare }, numRetries: 0 };
  const telemetry = new AIGatewayTelemetryClient({ ...opts, tsgId: '123' });
  const guardrails = new AIGatewayGuardrailsClient({
    ...opts,
    adminBaseUrl: 'https://admin.example/v2',
  });
  const organisations = new AIGatewayOrganisationsClient({
    ...opts,
    baseUrl: 'https://admin.example/v2',
  });
  beforeEach(() => {
    fetch.mockReset();
    prepare.mockClear();
    vi.stubGlobal('fetch', fetch);
  });
  afterEach(() => vi.unstubAllGlobals());
  const cases = [
    {
      name: 'error categories',
      read: () => telemetry.errorCategoryTrends(window),
      body: categories,
      url: 'https://data.example/v2/logs/charts/error-category-trends',
    },
    {
      name: 'grouped errors',
      read: () => telemetry.groupedErrors(window),
      body: grouped,
      url: 'https://data.example/v2/logs/charts/grouped-errors',
    },
    {
      name: 'filter boundaries',
      read: () => telemetry.filterBoundaries(window),
      body: boundaries,
      url: 'https://data.example/v2/analytics/filter-boundaries',
    },
    {
      name: 'organisation info',
      read: () => organisations.getInfo('123'),
      body: info,
      url: 'https://admin.example/v2/organisations/123/info',
    },
    {
      name: 'guardrail catalog',
      read: () => guardrails.getCatalog(),
      body: catalog,
      url: 'https://admin.example/v2/utils/static-resources/schema',
    },
  ];
  for (const c of cases) {
    it(`${c.name}: routes GET and preserves the response`, async () => {
      fetch.mockResolvedValue(new Response(JSON.stringify(c.body)));
      expect(await c.read()).toEqual(c.body);
      const [raw, init] = fetch.mock.calls[0];
      const url = new URL(raw);
      expect(url.origin + url.pathname).toBe(c.url);
      expect(init.method).toBe('GET');
      if (c.url.includes('/logs/charts/'))
        expect(url.searchParams.get('organisationId')).toBe('123');
      if (c.url.includes('/analytics/')) expect(url.searchParams.has('organisationId')).toBe(false);
      if (c.url.includes('/schema'))
        expect([...url.searchParams]).toEqual([['resource', 'guardrails']]);
      if (c.url.includes('/logs/') || c.url.includes('/analytics/')) {
        expect(url.searchParams.get('workspaceSlug')).toBe('ws-dev');
        expect(Date.parse(url.searchParams.get('timeOfGenerationMin')!)).toBe(
          window.start.getTime(),
        );
        expect(Date.parse(url.searchParams.get('timeOfGenerationMax')!)).toBe(window.end.getTime());
        expect(raw).not.toContain('Z&');
      }
      expect(prepare).toHaveBeenCalledOnce();
    });
    it(`${c.name}: rejects malformed response`, async () => {
      fetch.mockResolvedValue(new Response('{}'));
      await expect(c.read()).rejects.toMatchObject({
        errorType: ErrorType.RESPONSE_VALIDATION,
      });
    });
    it.each([400, 401, 403, 429, 500])(`${c.name}: propagates HTTP %i`, async (status) => {
      fetch.mockResolvedValue(new Response('{}', { status }));
      await expect(c.read()).rejects.toMatchObject({ statusCode: status });
      expect(fetch).toHaveBeenCalledOnce();
    });
  }
  it.each([0, 1, 3])(
    'serializes currentPage=%i without treating zero as absent',
    async (currentPage) => {
      fetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { records: [], total: 0, capturedTotal: 0, isQuotaExceeded: false },
          }),
        ),
      );
      await telemetry.logs({
        ...window,
        currentPage,
        pageSize: 50,
        statusCode: 429,
        traceId: 'example',
      });
      const url = new URL(fetch.mock.calls[0][0]);
      expect(url.searchParams.get('currentPage')).toBe(String(currentPage));
      expect(url.searchParams.get('pageSize')).toBe('50');
      expect(url.searchParams.get('statusCode')).toBe('429');
      expect(url.searchParams.get('traceId')).toBe('example');
    },
  );
  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1', null])(
    'rejects invalid page %s before auth',
    async (currentPage) => {
      await expect(telemetry.logs({ ...window, currentPage } as never)).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(prepare).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each(['errorCategoryTrends', 'groupedErrors', 'filterBoundaries'] as const)(
    '%s validates window and unknown fields before auth',
    async (method) => {
      for (const input of [
        { ...window, workspaceSlug: '../bad' },
        { ...window, extra: true },
        { ...window, start: new Date('invalid') },
        { ...window, end: new Date('2000-01-01') },
      ])
        await expect(telemetry[method](input as never)).rejects.toMatchObject({
          errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        });
      expect(prepare).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('validates organisation path and refuses to infer a catalog admin endpoint', async () => {
    await expect(organisations.getInfo('../bad')).rejects.toBeDefined();
    await expect(new AIGatewayGuardrailsClient(opts).getCatalog()).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('wires admin catalog through the root client with OAuth and TSG headers', async () => {
    fetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'test-token', token_type: 'Bearer', expires_in: 900 }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify(catalog)));
    const client = new AIGatewayClient({
      clientId: 'id',
      clientSecret: 'secret',
      tsgId: '123',
      dataEndpoint: 'https://data.example/v2',
      adminEndpoint: 'https://admin.example/v2',
      tokenEndpoint: 'https://auth.example/token',
      numRetries: 0,
    });
    await client.guardrails.getCatalog();
    expect(String(fetch.mock.calls[1][0])).toBe(
      'https://admin.example/v2/utils/static-resources/schema?resource=guardrails',
    );
    const headers = new Headers(fetch.mock.calls[1][1].headers);
    expect(headers.get('authorization')).toBe('Bearer test-token');
    expect(headers.get('x-tsg-id')).toBe('123');
  });
  it('redacts new sensitive response subtrees without mutating data', () => {
    expect(redactAIGatewaySecrets('telemetry.filterBoundaries', boundaries, 'response').data).toBe(
      '[REDACTED]',
    );
    expect(redactAIGatewaySecrets('organisations.getInfo', info, 'response').settings).toBe(
      '[REDACTED]',
    );
    expect(info.settings.debug_log).toBe(0);
    expect(boundaries.data.unique_api_keys).toEqual([]);
  });
});

describe('dashboard schema contracts', () => {
  it('retains empty buckets and nested extension fields', () => {
    expect(GroupedErrorsResponseSchema.parse(grouped)).toEqual(grouped);
    expect(ErrorCategoryTrendsResponseSchema.parse(categories)).toEqual(categories);
    expect(GatewayFilterBoundariesResponseSchema.parse(boundaries)).toEqual(boundaries);
    expect(GatewayGuardrailCatalogResponseSchema.parse(catalog)).toEqual(catalog);
  });
  it('rejects malformed nested status counts and numeric boundaries', () => {
    expect(
      GroupedErrorsResponseSchema.safeParse({
        ...grouped,
        data: {
          ...grouped.data,
          trend: [{ x: 'date', y: [{ response_status_code: 429, count: '2' }] }],
        },
      }).success,
    ).toBe(false);
    expect(
      GatewayFilterBoundariesResponseSchema.safeParse({
        ...boundaries,
        data: { ...boundaries.data, cost_max: '0' },
      }).success,
    ).toBe(false);
  });
  it('types protocol-specific counts while accepting legacy chart responses', () => {
    const old = {
      success: true,
      data: { records: [{ x: 'date', y: 1 }], total: 1, isQuotaExceeded: false },
    };
    expect(CountChartResponseSchema.parse(old)).toEqual(old);
    expect(
      CountChartResponseSchema.safeParse({ ...old, data: { ...old.data, total_mcp_count: '1' } })
        .success,
    ).toBe(false);
    const tokens = {
      success: true,
      data: {
        records: [],
        total: 0,
        avg: 0,
        total_request_units: 0,
        total_response_units: 0,
        isQuotaExceeded: false,
        total_mcp_request_units: 0,
      },
    };
    expect(TokensChartResponseSchema.parse(tokens).data.total_mcp_request_units).toBe(0);
    expect(
      TokensChartResponseSchema.safeParse({
        ...tokens,
        data: { ...tokens.data, total_mcp_request_units: '0' },
      }).success,
    ).toBe(false);
  });
});
