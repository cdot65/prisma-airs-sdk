import { describe, expect, it } from 'vitest';
import {
  AI_GATEWAY_DEPLOYMENT_STATUSES,
  AI_GATEWAY_DEPLOYMENT_TYPES,
  AI_GATEWAY_KNOWN_API_KEY_SCOPES,
  AI_GATEWAY_KNOWN_CACHE_MODES,
  AI_GATEWAY_KNOWN_CONFIG_STRATEGIES,
  AI_GATEWAY_KNOWN_MCP_AUTH_TYPES,
  AI_GATEWAY_KNOWN_MCP_TRANSPORTS,
  AI_GATEWAY_KNOWN_RATE_LIMIT_TYPES,
  AI_GATEWAY_KNOWN_RATE_LIMIT_UNITS,
  AI_GATEWAY_MUTABLE_MCP_CAPABILITY_TYPES,
  GatewayJsonValueSchema,
  GatewayRoutingConfigSchema,
  GatewayVertexAIConfigurationSchema,
} from '../../src/models/ai-gateway-routing.js';

describe('AI Gateway value catalogs', () => {
  it.each([
    [AI_GATEWAY_DEPLOYMENT_STATUSES],
    [AI_GATEWAY_DEPLOYMENT_TYPES],
    [AI_GATEWAY_KNOWN_API_KEY_SCOPES],
    [AI_GATEWAY_KNOWN_CACHE_MODES],
    [AI_GATEWAY_KNOWN_CONFIG_STRATEGIES],
    [AI_GATEWAY_KNOWN_MCP_AUTH_TYPES],
    [AI_GATEWAY_KNOWN_MCP_TRANSPORTS],
    [AI_GATEWAY_KNOWN_RATE_LIMIT_TYPES],
    [AI_GATEWAY_KNOWN_RATE_LIMIT_UNITS],
    [AI_GATEWAY_MUTABLE_MCP_CAPABILITY_TYPES],
  ])('keeps %j alphabetically ordered and duplicate-free', (values) => {
    expect(values).toEqual([...new Set(values)].sort());
  });

  it('keeps deployment and mutable capability sets closed', () => {
    expect(AI_GATEWAY_DEPLOYMENT_TYPES).toEqual(['non_production', 'production']);
    expect(AI_GATEWAY_DEPLOYMENT_STATUSES).toEqual(['active', 'archived']);
    expect(AI_GATEWAY_MUTABLE_MCP_CAPABILITY_TYPES).toEqual(['prompt', 'resource', 'tool']);
  });
});

describe('GatewayJsonValueSchema', () => {
  it('accepts recursive finite JSON', () => {
    expect(
      GatewayJsonValueSchema.safeParse({ nested: [null, true, 3, 'value', { ok: false }] }).success,
    ).toBe(true);
  });

  it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, 1n, () => undefined])(
    'rejects non-JSON value %s',
    (value) => {
      expect(GatewayJsonValueSchema.safeParse(value).success).toBe(false);
    },
  );

  it.each([new Date(), new Map(), new Set(), Object.create({ inherited: true })])(
    'rejects non-plain object %s',
    (value) => {
      expect(GatewayJsonValueSchema.safeParse(value).success).toBe(false);
    },
  );

  it('rejects cycles and prototype-shaped object keys without recursing indefinitely', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(GatewayJsonValueSchema.safeParse(circular).success).toBe(false);
    expect(
      GatewayJsonValueSchema.safeParse(JSON.parse('{"__proto__":{"polluted":true}}')).success,
    ).toBe(false);
  });
});

describe('GatewayRoutingConfigSchema', () => {
  it('types known routing fields and preserves JSON extensions', () => {
    const result = GatewayRoutingConfigSchema.parse({
      retry: { attempts: 3, on_status_codes: [429, 503] },
      cache: { mode: 'simple', max_age: 3600 },
      strategy: { mode: 'fallback' },
      targets: [{ provider: '@vertex-prod', weight: 1 }],
      custom_feature: { enabled: true },
    });

    expect(result.retry?.attempts).toBe(3);
    expect(result.custom_feature).toEqual({ enabled: true });
  });

  it('accepts a future non-empty strategy but rejects invalid known-field values', () => {
    expect(
      GatewayRoutingConfigSchema.safeParse({ strategy: { mode: 'future-strategy' } }).success,
    ).toBe(true);
    expect(GatewayRoutingConfigSchema.safeParse({ retry: { attempts: -1 } }).success).toBe(false);
    expect(GatewayRoutingConfigSchema.safeParse({ retry: { on_status_codes: [99] } }).success).toBe(
      false,
    );
  });
});

describe('GatewayVertexAIConfigurationSchema', () => {
  it('accepts the OpenAPI-backed fields and provider extensions', () => {
    expect(
      GatewayVertexAIConfigurationSchema.safeParse({
        vertex_auth_type: 'serviceAccount',
        vertex_region: 'us-central1',
        vertex_service_account_json: { type: 'service_account' },
        future_vertex_option: true,
      }).success,
    ).toBe(true);
  });

  it('requires auth type and region', () => {
    expect(
      GatewayVertexAIConfigurationSchema.safeParse({ vertex_region: 'us-central1' }).success,
    ).toBe(false);
  });
});
