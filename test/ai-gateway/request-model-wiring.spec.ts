import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AIGatewayClient } from '../../src/ai-gateway/client.js';
import { ErrorType } from '../../src/errors.js';

const resourceId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';
const providerId = 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c';
const integrationId = 'f6692544-3265-49be-9711-bbdcebc079e4';

describe('AI Gateway request-schema wiring', () => {
  const originalFetch = globalThis.fetch;
  const gw = new AIGatewayClient({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    tsgId: '1852583913',
    dataEndpoint: 'https://data.example.com',
    adminEndpoint: 'https://admin.example.com',
    numRetries: 0,
  });

  beforeAll(() => {
    globalThis.fetch = vi.fn();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  const invalidCalls: Array<[string, () => Promise<unknown>]> = [
    ['workspaces.create', () => gw.workspaces.create({ name: '', scope_name: 'scope' })],
    ['workspaces.update', () => gw.workspaces.update('ws-development', {} as never)],
    ['configs.create', () => gw.configs.create({ name: '', workspace_id: resourceId, config: {} })],
    ['configs.update', () => gw.configs.update(resourceId, {} as never)],
    [
      'guardrails.create',
      () =>
        gw.guardrails.create({
          workspace_id: resourceId,
          name: 'guardrail',
          checks: [],
          actions: { deny: true },
        }),
    ],
    ['guardrails.update', () => gw.guardrails.update(resourceId, {} as never)],
    [
      'providers.create',
      () =>
        gw.providers.create({
          workspace_id: resourceId,
          ai_provider_id: providerId,
          integration_id: integrationId,
          name: '',
          slug: 'provider',
        }),
    ],
    ['providers.update', () => gw.providers.update(resourceId, {} as never)],
    [
      'apiKeys.createService',
      () =>
        gw.apiKeys.createService({
          name: '',
          scopes: ['completions.write'],
          organisation_id: '1852583913',
          workspace_id: resourceId,
          type: 'workspace',
        }),
    ],
    [
      'apiKeys.createUser',
      () =>
        gw.apiKeys.createUser({
          name: '',
          scopes: ['completions.write'],
          organisation_id: '1852583913',
          workspace_id: resourceId,
          user_id: resourceId,
          type: 'workspace',
        }),
    ],
    ['apiKeys.updateService', () => gw.apiKeys.updateService(resourceId, {} as never)],
    ['apiKeys.updateUser', () => gw.apiKeys.updateUser(resourceId, {} as never)],
    [
      'apiKeys.rotateService',
      () => gw.apiKeys.rotateService(resourceId, { key_transition_period_ms: 1 }),
    ],
    [
      'apiKeys.rotateUser',
      () => gw.apiKeys.rotateUser(resourceId, { key_transition_period_ms: 1 }),
    ],
    [
      'integrations.create',
      () =>
        gw.integrations.create({
          organisation_id: '1852583913',
          ai_provider_id: providerId,
          name: '',
          slug: 'integration',
        }),
    ],
    ['integrations.update', () => gw.integrations.update(integrationId, {} as never)],
    ['integrations.setModels', () => gw.integrations.setModels(integrationId, { models: [] })],
    ['integrations.setWorkspaces', () => gw.integrations.setWorkspaces(integrationId, {} as never)],
    [
      'mcpIntegrations.create',
      () =>
        gw.mcpIntegrations.create({
          name: 'mcp',
          organisation_id: '1852583913',
          slug: 'mcp',
          url: 'not-a-url',
          auth_type: 'none',
          transport: 'http',
        }),
    ],
    ['mcpIntegrations.update', () => gw.mcpIntegrations.update(integrationId, {} as never)],
    [
      'mcpIntegrations.setCapabilities',
      () => gw.mcpIntegrations.setCapabilities(integrationId, { capabilities: [] }),
    ],
    [
      'mcpIntegrations.setWorkspaces',
      () => gw.mcpIntegrations.setWorkspaces(integrationId, {} as never),
    ],
    [
      'deployments.create',
      () =>
        gw.deployments.create({
          name: 'gateway',
          type: 'invalid' as never,
          organisation_id: '1852583913',
        }),
    ],
    ['deployments.update', () => gw.deployments.update(resourceId, {} as never)],
    [
      'plugins.create',
      () =>
        gw.plugins.create({
          organisation_id: '1852583913',
          integration_id: integrationId,
          credentials: {},
        }),
    ],
    ['organisations.updateSelf', () => gw.organisations.updateSelf({} as never)],
    [
      'organisations.updateAuthSettings',
      () => gw.organisations.updateAuthSettings('1852583913', {} as never),
    ],
  ];

  it.each(invalidCalls)('%s rejects invalid input before fetch', async (_name, invoke) => {
    vi.mocked(globalThis.fetch).mockClear();
    await expect(invoke()).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
