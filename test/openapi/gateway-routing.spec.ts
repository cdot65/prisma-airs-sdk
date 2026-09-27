import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collectCallSites, type CallSite } from '../../scripts/openapi/inventory.js';
import {
  gatewayBindings,
  gatewayCallPlane,
  gatewayRouteVariants,
  gatewayServerRoute,
  officialGatewayOperations,
  type GatewayDocument,
} from '../../scripts/openapi/gateway-routing.js';
import { correctPromptRuntimeContracts } from '../../scripts/openapi/prompt-contracts.js';

const source = `
const control = opts.dataEndpoint ?? DEFAULT_AI_GW_DATA_ENDPOINT;
const administrative = opts.adminEndpoint ?? DEFAULT_AI_GW_ADMIN_ENDPOINT;
const dataOpts = { baseUrl: control };
const adminOpts = { baseUrl: administrative };
new Guardrails({ ...dataOpts, adminBaseUrl: administrative });
new Integrations(adminOpts);
`;
const bindings = gatewayBindings(source);
const call = (path: string, overrides: Partial<CallSite> = {}): CallSite => ({
  method: 'GET',
  path,
  source: 'src/ai-gateway/guardrails-client.ts',
  member: 'list',
  plane: 'gateway',
  className: 'Guardrails',
  gatewayBaseUrl: 'this.baseUrl',
  ...overrides,
});
const spec: GatewayDocument = {
  servers: [{ url: 'https://aigw.portkey.ai/v1' }],
  paths: {
    '/guardrails': {
      servers: [{ url: 'https://api.apps.paloaltonetworks.com/ai_gw/v2' }],
      get: {},
    },
    '/admin/v2/guardrails': {
      servers: [{ url: 'https://api.apps.paloaltonetworks.com/ai_gw' }],
      get: {},
    },
  },
};

describe('official gateway operation routing', () => {
  it('does not count a control-plane call as admin coverage', () => {
    const ops = officialGatewayOperations(spec, [call('/guardrails')], bindings);
    expect(ops.map((op) => op.implementations.length)).toEqual([1, 0]);
    const admin = call('/guardrails', { gatewayBaseUrl: 'this.adminBaseUrl' });
    expect(
      officialGatewayOperations(spec, [admin], bindings).map((op) => op.implementations.length),
    ).toEqual([0, 1]);
  });
  it('follows operation server overrides and refuses unknown hosts or unresolved variables', () => {
    const local = structuredClone(spec);
    local.paths!['/guardrails'].get = {
      servers: [{ url: 'https://api.apps.paloaltonetworks.com/ai_gw/admin/v2' }],
    };
    expect(
      officialGatewayOperations(local, [call('/guardrails')], bindings)[0].implementations,
    ).toEqual([]);
    expect(gatewayServerRoute('https://untrusted.example/ai_gw/v2', '/guardrails')).toBeUndefined();
    expect(gatewayServerRoute('https://{host}/v1', '/models')).toBeUndefined();
    expect(
      gatewayServerRoute('https://api.apps.paloaltonetworks.com/ai_gw/v2?x=1', '/guardrails'),
    ).toBeUndefined();
  });
  it('requires both user/service key creation variants without counting two operations', () => {
    const keys: GatewayDocument = {
      servers: [{ url: 'https://api.apps.paloaltonetworks.com/ai_gw/v2' }],
      paths: {
        '/api-keys/{sub-type}': {
          post: {
            parameters: [{ name: 'sub-type', in: 'path', schema: { enum: ['service', 'user'] } }],
          },
        },
      },
    };
    const service = call('/api-keys/service', { method: 'POST' });
    const user = call('/api-keys/user', { method: 'POST' });
    expect(officialGatewayOperations(keys, [service], bindings)[0].implementations).toEqual([]);
    const ops = officialGatewayOperations(keys, [service, user], bindings);
    expect(ops).toHaveLength(1);
    expect(ops[0].implementations).toEqual([service, user]);
    expect(
      officialGatewayOperations(keys, [call('/api-keys/{id}', { method: 'POST' })], bindings)[0]
        .implementations,
    ).toEqual([]);
  });
  it('applies operation parameter precedence and bounds enum expansion', () => {
    const keys: GatewayDocument = {
      servers: [{ url: 'https://api.apps.paloaltonetworks.com/ai_gw/v2' }],
      paths: {
        '/keys/{kind}': {
          parameters: [{ name: 'kind', in: 'path', schema: { enum: ['old'] } }],
          get: { parameters: [{ name: 'kind', in: 'path', schema: { enum: ['new'] } }] },
        },
      },
    };
    expect(
      officialGatewayOperations(keys, [call('/keys/new')], bindings)[0].implementations,
    ).toHaveLength(1);
    expect(() =>
      gatewayRouteVariants(
        '/{a}/{b}',
        ['a', 'b'].map((name) => ({
          name,
          in: 'path',
          schema: { enum: Array.from({ length: 12 }, (_, i) => String(i)) },
        })),
      ),
    ).toThrow('128');
    expect(() =>
      gatewayRouteVariants('/{a}', [{ name: 'a', in: 'path', schema: { enum: ['bad/path'] } }]),
    ).toThrow('Invalid');
  });
  it('retains base path prefixes and does not attribute the public pricing client to SCM', () => {
    expect(
      gatewayServerRoute(
        'https://api.apps.paloaltonetworks.com/ai_gw',
        '/admin/v2/guardrails/{id}',
      ),
    ).toEqual({ plane: 'admin', path: '/guardrails/{id}' });
    const pricing = call('/pricing/{id}', { className: 'AIGatewayModelPricingClient' });
    expect(gatewayCallPlane(pricing, bindings)).toBe('public');
    expect(
      gatewayCallPlane(call('/x', { gatewayBaseUrl: 'this.urlFor(options.plane)' }), bindings),
    ).toBeUndefined();
  });
  it('retains unmatched HTTP methods and refuses partial server coverage', () => {
    const document: GatewayDocument = {
      servers: [
        { url: 'https://api.apps.paloaltonetworks.com/ai_gw/v2' },
        { url: 'https://unknown.example/v2' },
      ],
      paths: { '/guardrails': { get: {}, head: {}, options: {} } },
    };
    const operations = officialGatewayOperations(document, [call('/guardrails')], bindings);
    expect(operations.map((op) => op.method)).toEqual(['GET', 'HEAD', 'OPTIONS']);
    expect(operations.every((op) => op.implementations.length === 0)).toBe(true);
  });
  it('derives client planes from composition-root constructor arguments', () => {
    const changed = gatewayBindings(
      source.replace('new Integrations(adminOpts)', 'new Integrations(dataOpts)'),
    );
    const integration = call('/integrations', { className: 'Integrations' });
    expect(gatewayCallPlane(integration, bindings)).toBe('admin');
    expect(gatewayCallPlane(integration, changed)).toBe('control');
    const unknown = gatewayBindings(
      source.replace(
        'new Integrations(adminOpts)',
        'new Integrations({ ...adminOpts, baseUrl: unknown })',
      ),
    );
    expect(gatewayCallPlane(integration, unknown)).toBeUndefined();
  });
  it('connects actual SDK call sites to their declared transport planes', () => {
    const actual = gatewayBindings(
      readFileSync(new URL('../../src/ai-gateway/client.ts', import.meta.url), 'utf8'),
    );
    const calls = collectCallSites();
    const find = (className: string, member: string) =>
      calls.find((c) => c.className === className && c.member === member)!;
    expect(gatewayCallPlane(find('AIGatewayGuardrailsClient', 'list'), actual)).toBe('control');
    expect(gatewayCallPlane(find('AIGatewayIntegrationsClient', 'list'), actual)).toBe('admin');
    expect(gatewayCallPlane(find('AIGatewayRuntimeResourcesClient', 'createImage'), actual)).toBe(
      'runtime',
    );
  });
});

function legacyShape() {
  return {
    components: {
      schemas: {
        CreateCompletionResponse: {
          properties: {
            choices: { items: { properties: { finish_reason: { type: 'string' } } } },
            usage: { type: 'object' },
            system_fingerprint: { type: 'string' },
          },
        },
      },
    },
    paths: {} as Record<string, unknown>,
  };
}
describe('source-specific legacy compatibility corrections', () => {
  it('corrects shared completion nullability without inventing excluded prompt routes', () => {
    const document = legacyShape();
    correctPromptRuntimeContracts(document, 'excluded');
    expect(document.paths).toEqual({});
    expect(document.components.schemas.CreateCompletionResponse.properties.usage).toEqual({
      type: 'object',
      nullable: true,
    });
  });
  it('still rejects missing legacy routes, unexpected reintroduction and malformed completion schemas', () => {
    expect(() => correctPromptRuntimeContracts(legacyShape())).toThrow('Missing prompt runtime');
    const reintroduced = legacyShape();
    reintroduced.paths['/prompts/{promptId}/render'] = { post: {} };
    expect(() => correctPromptRuntimeContracts(reintroduced, 'excluded')).toThrow(
      'Excluded prompt',
    );
    expect(() =>
      correctPromptRuntimeContracts({ components: { schemas: {} } }, 'excluded'),
    ).toThrow('Legacy completion schema changed');
  });
});
