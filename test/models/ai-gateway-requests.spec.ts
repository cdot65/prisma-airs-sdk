import { describe, expect, it } from 'vitest';
import {
  GatewayApiKeyRotateRequestSchema,
  GatewayApiKeyUpdateRequestSchema,
  GatewayConfigCreateRequestSchema,
  GatewayConfigUpdateRequestSchema,
  GatewayDeploymentCreateRequestSchema,
  GatewayDeploymentUpdateRequestSchema,
  GatewayGuardrailCreateRequestSchema,
  GatewayGuardrailUpdateRequestSchema,
  GatewayIntegrationCreateRequestSchema,
  GatewayIntegrationModelsBulkUpdateRequestSchema,
  GatewayIntegrationUpdateRequestSchema,
  GatewayIntegrationWorkspacesBulkUpdateRequestSchema,
  GatewayOrganisationAuthSettingsUpdateRequestSchema,
  GatewayOrganisationUpdateRequestSchema,
  GatewayPluginCreateRequestSchema,
  GatewayProviderCreateRequestSchema,
  GatewayProviderUpdateRequestSchema,
  GatewayRateLimitInputSchema,
  GatewaySecretMappingSchema,
  GatewayServiceApiKeyCreateRequestSchema,
  GatewayUsageLimitInputSchema,
  GatewayUserApiKeyCreateRequestSchema,
  GatewayWorkspaceCreateRequestSchema,
  GatewayWorkspaceUpdateRequestSchema,
  McpIntegrationCapabilitiesBulkUpdateRequestSchema,
  McpIntegrationCreateRequestSchema,
  McpIntegrationUpdateRequestSchema,
  McpIntegrationWorkspacesBulkUpdateRequestSchema,
} from '../../src/models/ai-gateway-requests.js';

const workspaceId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';
const integrationId = 'f6692544-3265-49be-9711-bbdcebc079e4';
const providerId = 'de7d7d50-31cd-11ee-b93b-0e06f1aa7f7c';

describe('AI Gateway shared request inputs', () => {
  it('validates rate and usage limit bounds and reset exclusivity', () => {
    expect(
      GatewayRateLimitInputSchema.safeParse({ type: 'requests', unit: 'rpm', value: 100 }).success,
    ).toBe(true);
    expect(
      GatewayRateLimitInputSchema.safeParse({ type: 'requests', unit: 'rpm', value: -1 }).success,
    ).toBe(false);
    expect(
      GatewayUsageLimitInputSchema.safeParse({
        type: 'cost',
        credit_limit: 100,
        periodic_reset: 'monthly',
        periodic_reset_days: 30,
      }).success,
    ).toBe(false);
  });

  it('validates typed secret mappings', () => {
    expect(
      GatewaySecretMappingSchema.safeParse({
        target_field: 'configurations.vertex_service_account_json',
        secret_reference_id: 'vertex-sa',
        value_format: 'json',
      }).success,
    ).toBe(true);
    expect(GatewaySecretMappingSchema.safeParse({ target_field: 'key' }).success).toBe(false);
  });
});

describe('AI Gateway create request schemas', () => {
  it.each([
    [GatewayWorkspaceCreateRequestSchema, { name: 'Dev', scope_name: 'ws_dev_scope' }],
    [
      GatewayConfigCreateRequestSchema,
      { name: 'routing', workspace_id: workspaceId, config: { retry: { attempts: 3 } } },
    ],
    [
      GatewayGuardrailCreateRequestSchema,
      {
        workspace_id: workspaceId,
        name: 'AIRS',
        checks: [{ id: 'panw-prisma-airs.intercept', is_enabled: true }],
        actions: { deny: true },
      },
    ],
    [
      GatewayProviderCreateRequestSchema,
      {
        workspace_id: workspaceId,
        ai_provider_id: providerId,
        integration_id: integrationId,
        name: 'Vertex',
        slug: 'vertex',
      },
    ],
    [
      GatewayIntegrationCreateRequestSchema,
      {
        organisation_id: '1852583913',
        ai_provider_id: providerId,
        name: 'Vertex',
        slug: 'vertex',
        configurations: { vertex_auth_type: 'basic', vertex_region: 'us-central1' },
      },
    ],
    [
      McpIntegrationCreateRequestSchema,
      {
        name: 'Context',
        organisation_id: '1852583913',
        slug: 'context',
        url: 'https://mcp.example.com/mcp',
        auth_type: 'none',
        transport: 'http',
      },
    ],
    [
      GatewayDeploymentCreateRequestSchema,
      { name: 'dev gateway', type: 'non_production', organisation_id: '1852583913' },
    ],
    [
      GatewayPluginCreateRequestSchema,
      {
        organisation_id: '1852583913',
        integration_id: integrationId,
        credentials: { AIRS_API_KEY: 'secret' },
      },
    ],
  ])('accepts a valid %s body', (schema, body) => {
    expect(schema.safeParse(body).success).toBe(true);
  });

  it('splits service and user API-key creation', () => {
    const base = {
      name: 'key',
      scopes: ['completions.write'],
      organisation_id: '1852583913',
      workspace_id: workspaceId,
      type: 'workspace',
    };
    expect(GatewayServiceApiKeyCreateRequestSchema.safeParse(base).success).toBe(true);
    expect(
      GatewayServiceApiKeyCreateRequestSchema.safeParse({ ...base, user_id: integrationId })
        .success,
    ).toBe(false);
    expect(GatewayUserApiKeyCreateRequestSchema.safeParse(base).success).toBe(false);
    expect(
      GatewayUserApiKeyCreateRequestSchema.safeParse({ ...base, user_id: integrationId }).success,
    ).toBe(true);
  });
});

describe('AI Gateway update and binding schemas', () => {
  const partialUpdates = [
    GatewayWorkspaceUpdateRequestSchema,
    GatewayConfigUpdateRequestSchema,
    GatewayGuardrailUpdateRequestSchema,
    GatewayProviderUpdateRequestSchema,
    GatewayApiKeyUpdateRequestSchema,
    GatewayIntegrationUpdateRequestSchema,
    McpIntegrationUpdateRequestSchema,
    GatewayDeploymentUpdateRequestSchema,
    GatewayOrganisationUpdateRequestSchema,
    GatewayOrganisationAuthSettingsUpdateRequestSchema,
  ];

  it.each(partialUpdates)('rejects an empty %s body', (schema) => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('rejects misspelled stable fields', () => {
    expect(GatewayWorkspaceUpdateRequestSchema.safeParse({ descripton: 'typo' }).success).toBe(
      false,
    );
    expect(GatewayDeploymentUpdateRequestSchema.safeParse({ rotateAuth: true }).success).toBe(
      false,
    );
  });

  it('validates bulk model, workspace, and MCP capability mutations', () => {
    expect(
      GatewayIntegrationModelsBulkUpdateRequestSchema.safeParse({
        models: [{ slug: 'gpt-4', enabled: true }],
      }).success,
    ).toBe(true);
    expect(
      GatewayIntegrationWorkspacesBulkUpdateRequestSchema.safeParse({
        workspaces: [{ id: 'ws-develo-71f8d8', enabled: true }],
        global_workspace_access: { enabled: false },
      }).success,
    ).toBe(true);
    expect(
      GatewayIntegrationWorkspacesBulkUpdateRequestSchema.safeParse({
        global_workspace_access: false,
      }).success,
    ).toBe(false);
    expect(
      McpIntegrationCapabilitiesBulkUpdateRequestSchema.safeParse({
        capabilities: [{ name: 'lookup', type: 'tool', enabled: false }],
      }).success,
    ).toBe(true);
    expect(
      McpIntegrationCapabilitiesBulkUpdateRequestSchema.safeParse({
        capabilities: [{ name: 'template', type: 'resource_template', enabled: false }],
      }).success,
    ).toBe(false);
    expect(
      McpIntegrationWorkspacesBulkUpdateRequestSchema.safeParse({ workspaces: [] }).success,
    ).toBe(true);
  });

  it('enforces API-key rotation minimum', () => {
    expect(GatewayApiKeyRotateRequestSchema.safeParse({}).success).toBe(true);
    expect(
      GatewayApiKeyRotateRequestSchema.safeParse({ key_transition_period_ms: 1_799_999 }).success,
    ).toBe(false);
  });
});
