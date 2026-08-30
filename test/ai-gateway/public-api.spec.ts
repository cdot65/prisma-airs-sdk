import { describe, expect, expectTypeOf, it } from 'vitest';
import * as sdk from '../../src/index.js';
import * as requestModels from '../../src/models/ai-gateway-requests.js';
import * as routingModels from '../../src/models/ai-gateway-routing.js';
import {
  AI_GATEWAY_DEPLOYMENT_TYPES,
  AI_GATEWAY_SECRET_FIELDS,
  buildDottedObject,
  redactAIGatewaySecrets,
  type GatewayConfigCreateRequest,
  type GatewayIntegrationCreateRequest,
  type GatewayIntegrationModelsBulkUpdateRequest,
  type GatewayIntegrationModelsRequest,
  type GatewayIntegrationWorkspacesBulkUpdateRequest,
  type GatewayIntegrationWorkspacesRequest,
  type GatewayRoutingConfig,
  type McpIntegrationCapabilitiesBulkUpdateRequest,
  type McpIntegrationCapabilitiesUpdateRequest,
  type McpIntegrationWorkspacesBulkUpdateRequest,
  type McpIntegrationWorkspacesRequest,
} from '../../src/index.js';

describe('AI Gateway 0.20 public API', () => {
  it('exports request and routing schemas from the package root', () => {
    for (const [exportName, value] of Object.entries({ ...requestModels, ...routingModels })) {
      expect(sdk[exportName as keyof typeof sdk], exportName).toBe(value);
    }
    expect(AI_GATEWAY_DEPLOYMENT_TYPES).toEqual(['non_production', 'production']);
  });

  it('exports builders and operation-scoped secret metadata from the package root', () => {
    expect(buildDottedObject([{ path: 'retry.attempts', value: 3 }])).toEqual({
      retry: { attempts: 3 },
    });
    expect(redactAIGatewaySecrets).toBeTypeOf('function');
    expect(AI_GATEWAY_SECRET_FIELDS['integrations.create']).toBeDefined();
  });

  it('exports inferred request and routing types from the package root', () => {
    expectTypeOf<GatewayConfigCreateRequest>().toMatchTypeOf<{
      name: string;
      workspace_id: string;
      config: GatewayRoutingConfig;
    }>();
    expectTypeOf<GatewayIntegrationCreateRequest>().toHaveProperty('configurations');
    expectTypeOf<GatewayIntegrationModelsRequest>().toEqualTypeOf<GatewayIntegrationModelsBulkUpdateRequest>();
    expectTypeOf<GatewayIntegrationWorkspacesRequest>().toEqualTypeOf<GatewayIntegrationWorkspacesBulkUpdateRequest>();
    expectTypeOf<McpIntegrationCapabilitiesUpdateRequest>().toEqualTypeOf<McpIntegrationCapabilitiesBulkUpdateRequest>();
    expectTypeOf<McpIntegrationWorkspacesRequest>().toEqualTypeOf<McpIntegrationWorkspacesBulkUpdateRequest>();
  });
});
