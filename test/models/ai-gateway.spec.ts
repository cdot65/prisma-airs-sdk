import { describe, it, expect } from 'vitest';
import {
  CostChartResponseSchema,
  LatencyChartResponseSchema,
  RescuedRetriesResponseSchema,
  GroupListResponseSchema,
  UserGroupResponseSchema,
  GatewayLogsResponseSchema,
  ListWorkspacesResponseSchema,
  ListConfigsResponseSchema,
  GatewayConfigDetailSchema,
  GatewayConfigCreateResponseSchema,
  ListGuardrailsResponseSchema,
  GatewayGuardrailDetailSchema,
  GatewayGuardrailCreateResponseSchema,
  GatewayProviderCreateResponseSchema,
  ListDeploymentsResponseSchema,
  GatewayDeploymentCreateResponseSchema,
  GatewayAuditLogsResponseSchema,
  ListMcpIntegrationsResponseSchema,
  GatewayIntegrationWorkspacesResponseSchema,
} from '../../src/models/ai-gateway.js';

describe('AI Gateway telemetry schemas', () => {
  it('parses a cost chart (values in cents)', () => {
    const r = CostChartResponseSchema.parse({
      success: true,
      data: {
        records: [{ x: '2026-07-20T05:00:00.000Z', y: 68064.028, avg: 20.342 }],
        total: 411082.598,
        avg: 19.981,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.total).toBe(411082.598);
  });

  it('parses per-bucket latency percentiles', () => {
    const r = LatencyChartResponseSchema.parse({
      success: true,
      data: {
        records: [
          { x: '2026-07-20T05:00:00.000Z', y: 2296.845, p50: 1855, p90: 3570, p99: 8611.8 },
        ],
        total: 2202.043,
        p50: 1750,
        p90: 3599.9,
        p99: 8329.14,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.records[0].p99).toBe(8611.8);
  });

  it('parses rescued-retries where record y is an ARRAY', () => {
    const r = RescuedRetriesResponseSchema.parse({
      success: true,
      data: {
        trend: [{ x: '2026-07-20T05:00:00.000Z', y: [] }],
        total: 0,
        trends: [{ x: '2026-07-20T05:00:00.000Z', retry: [], fallback: [] }],
        retryTotal: 0,
        fallbackTotal: 0,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.trend[0].y).toEqual([]);
  });

  it('accepts an unobserved-shape rescued-retries trend[].y element', () => {
    // y's element shape has never been observed on a live tenant (only empty arrays so far).
    // It's typed z.array(z.unknown()) like its trends[].retry/fallback siblings — confirm it
    // doesn't reject whatever shape a tenant with actual retries eventually sends.
    const r = RescuedRetriesResponseSchema.parse({
      success: true,
      data: {
        trend: [{ x: '2026-07-20T05:00:00.000Z', y: [{ anything: 'goes', count: 3 }, 42, 'x'] }],
        total: 3,
        trends: [{ x: '2026-07-20T05:00:00.000Z', retry: [], fallback: [] }],
        retryTotal: 0,
        fallbackTotal: 0,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.trend[0].y).toHaveLength(3);
  });

  it('parses a groups row using the snake_case quota flag', () => {
    const r = GroupListResponseSchema.parse({
      object: 'list',
      is_quota_exceeded: false,
      total: 1,
      data: [{ model: 'claude-sonnet-5', requests: 10506, cost: 29704.16, object: 'log' }],
    });
    expect(r.data[0].requests).toBe(10506);
  });

  it('parses groups/users, which uses the OTHER envelope', () => {
    const r = UserGroupResponseSchema.parse({
      success: true,
      data: {
        records: [{ _user: '', count: 25748, cost: 411060.85 }],
        total: 1,
        isQuotaExceeded: false,
      },
    });
    expect(r.data.records[0]._user).toBe('');
  });

  it('parses a log record with 0/1 integer booleans', () => {
    const r = GatewayLogsResponseSchema.parse({
      success: true,
      data: {
        records: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            workspace_slug: 'ws-main-a-349e0e',
            ai_model: 'claude-sonnet-5',
            _user: '',
            total_units: 63809,
            cost: 1.383,
            trace_id: 'claude-code-calvin',
            is_proxy_call: 0,
            created_at: '2026-07-27T10:48:22.059Z',
            is_success: 1,
            cache_status: 'DISABLED',
            retry_success_count: 0,
            mode: 'single',
            last_used_option_index: -1,
            response_status_code: 200,
            request_url: 'https://api.anthropic.com/v1/messages',
            request_method: 'POST',
            ai_org: 'anthropic',
            api_key_id: 'k1',
            license_id: '22222222-2222-4222-8222-222222222222',
            log_store_file_path_format: 'v2',
            metadataKey: [],
            metadataValue: [],
            prompt_slug: '',
            feedback: [],
          },
        ],
        total: 25750,
        isQuotaExceeded: false,
        capturedTotal: 0,
      },
    });
    expect(r.data.records[0].is_success).toBe(1);
  });

  it('tolerates unknown upstream fields (passthrough)', () => {
    const r = CostChartResponseSchema.parse({
      success: true,
      data: { records: [], total: 0, avg: 0, isQuotaExceeded: false, brandNewField: 'x' },
    });
    expect((r.data as Record<string, unknown>).brandNewField).toBe('x');
  });
});

describe('AI Gateway resource schemas', () => {
  it('parses a workspace list', () => {
    const r = ListWorkspacesResponseSchema.parse({
      object: 'list',
      total: 1,
      data: [
        {
          id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
          slug: 'ws-main-a-349e0e',
          name: 'talos_k8s_cluster',
          icon: null,
          description: 'Default workspace',
          created_at: '2026-07-16T15:48:18.000Z',
          last_updated_at: '2026-07-17T12:25:22.000Z',
          is_default: 0,
          status: 'active',
          scope_name: 'main_airs_workspace_1852583913',
          object: 'workspace',
        },
      ],
    });
    expect(r.data[0].scope_name).toBe('main_airs_workspace_1852583913');
  });

  it('parses a config LIST row — 12 fields, no config/format/type/version_id', () => {
    const r = ListConfigsResponseSchema.parse({
      object: 'list',
      total: 1,
      data: [
        {
          id: '764cf9cd-4ebf-449e-b669-08149b0fbbbc',
          name: 'claude-code',
          slug: 'pc-claude-e46fe6',
          organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
          is_default: 0,
          status: 'active',
          owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
          updated_by: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
          created_at: '2026-07-17T00:42:44.000Z',
          last_updated_at: '2026-07-17T00:42:44.000Z',
          workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
          object: 'config',
        },
      ],
    });
    expect(r.data[0].status).toBe('active');
    expect((r.data[0] as unknown as { config?: string }).config).toBeUndefined();
    expect((r.data[0] as unknown as { format?: string }).format).toBeUndefined();
  });

  it('parses a config DETAIL read, which adds config/format/type/version_id', () => {
    const r = GatewayConfigDetailSchema.parse({
      id: '764cf9cd-4ebf-449e-b669-08149b0fbbbc',
      name: 'claude-code',
      slug: 'pc-claude-e46fe6',
      organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
      is_default: 0,
      status: 'active',
      owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
      updated_by: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
      created_at: '2026-07-17T00:42:44.000Z',
      last_updated_at: '2026-07-17T00:42:44.000Z',
      workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
      config: '{"provider":"@anthropic-prod"}',
      format: 'json',
      type: 'ORG_CONFIG',
      version_id: 'v1',
      object: 'config',
    });
    expect(typeof r.config).toBe('string');
  });

  it('parses the config CREATE receipt, which is NOT the record shape', () => {
    const r = GatewayConfigCreateResponseSchema.parse({
      id: '764cf9cd-4ebf-449e-b669-08149b0fbbbc',
      version_id: 'v1',
      slug: 'pc-sdk-ve-14620d',
      object: 'config',
    });
    expect(r.slug).toBe('pc-sdk-ve-14620d');
    expect((r as unknown as { name?: string }).name).toBeUndefined();
    expect((r as unknown as { config?: string }).config).toBeUndefined();
  });

  it('parses a guardrail LIST row — 11 fields, no checks/actions/version_id', () => {
    const r = ListGuardrailsResponseSchema.parse({
      object: 'list',
      total: 1,
      data: [
        {
          id: '9f6c2a8e-2b3d-4e5f-8a9b-0c1d2e3f4a5b',
          name: 'PrismaAIRS',
          slug: 'pg-prisma-099a16',
          organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
          status: 'active',
          owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
          updated_by: null,
          created_at: '2026-07-17T00:42:44.000Z',
          last_updated_at: '2026-07-17T00:42:44.000Z',
          workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
          object: 'guardrail',
        },
      ],
    });
    expect(r.data[0].slug).toBe('pg-prisma-099a16');
    expect(r.data[0].updated_by).toBeNull();
    expect((r.data[0] as unknown as { checks?: unknown }).checks).toBeUndefined();
  });

  it('parses a guardrail DETAIL read, adding checks/actions/version_id', () => {
    const r = GatewayGuardrailDetailSchema.parse({
      checks: [
        {
          id: 'panw-prisma-airs.intercept',
          parameters: { profile_name: 'AI Gateway - Strict', ai_model: '', app_user: '' },
          is_enabled: true,
        },
      ],
      actions: {
        deny: false,
        async: false,
        sequential: false,
        on_success: { feedback: { value: 5, weight: 1, metadata: '' } },
        on_fail: { feedback: { value: -5, weight: 1, metadata: '' } },
      },
      version_id: 'v1',
      created_at: '2026-07-17T00:42:44.000Z',
      id: '9f6c2a8e-2b3d-4e5f-8a9b-0c1d2e3f4a5b',
      name: 'PrismaAIRS',
      slug: 'pg-prisma-099a16',
      organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
      status: 'active',
      owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
      updated_by: null,
      last_updated_at: '2026-07-17T00:42:44.000Z',
      workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
      object: 'guardrail',
    });
    expect(r.checks[0].id).toBe('panw-prisma-airs.intercept');
    expect(r.actions.on_success?.feedback.value).toBe(5);
    expect(r.updated_by).toBeNull();
  });

  it('parses a guardrail DETAIL read without on_success/on_fail (optional)', () => {
    const r = GatewayGuardrailDetailSchema.parse({
      checks: [],
      actions: { deny: false, async: false, sequential: false },
      version_id: 'v1',
      created_at: '2026-07-17T00:42:44.000Z',
      id: '9f6c2a8e-2b3d-4e5f-8a9b-0c1d2e3f4a5b',
      name: 'no-feedback',
      slug: 'pg-no-feedback',
      organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
      status: 'active',
      owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
      updated_by: null,
      last_updated_at: '2026-07-17T00:42:44.000Z',
      workspace_id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
      object: 'guardrail',
    });
    expect(r.actions.on_success).toBeUndefined();
    expect(r.actions.on_fail).toBeUndefined();
  });

  it('parses the guardrail CREATE receipt, which is NOT the record shape', () => {
    const r = GatewayGuardrailCreateResponseSchema.parse({
      id: '9f6c2a8e-2b3d-4e5f-8a9b-0c1d2e3f4a5b',
      version_id: 'v1',
      slug: 'pg-sdk-ve-874b62',
      object: 'guardrail',
    });
    expect(r.slug).toBe('pg-sdk-ve-874b62');
    expect((r as unknown as { checks?: unknown }).checks).toBeUndefined();
    expect((r as unknown as { actions?: unknown }).actions).toBeUndefined();
  });

  it('parses the provider CREATE receipt, which has NO version_id unlike configs/guardrails', () => {
    const r = GatewayProviderCreateResponseSchema.parse({
      id: 'f6692544-3265-49be-9711-bbdcebc079e4',
      slug: 'sdk-verify-delete-me-provider',
      object: 'provider',
    });
    expect(r.slug).toBe('sdk-verify-delete-me-provider');
    expect((r as unknown as { version_id?: string }).version_id).toBeUndefined();
    expect((r as unknown as { name?: string }).name).toBeUndefined();
  });

  it('parses an MCP integration, keeping configurations as an unparsed JSON STRING', () => {
    const r = ListMcpIntegrationsResponseSchema.parse({
      object: 'list',
      total: 1,
      data: [
        {
          id: '2a6f4e2e-6f5a-4a1f-9d0e-9b2b6f6c3a11',
          organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
          name: 'Context 7',
          owner_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
          status: 'active',
          type: 'MCP_INTEGRATION',
          url: 'https://mcp.context7.com/mcp',
          auth_type: 'none',
          transport: 'http',
          configurations: '{}',
          created_at: '2026-07-17T00:42:44.000Z',
          last_updated_at: '2026-07-17T00:42:44.000Z',
        },
      ],
    });
    expect(typeof r.data[0].configurations).toBe('string');
  });

  it('parses integration workspaces, where global_workspace_access is an OBJECT not a boolean', () => {
    const r = GatewayIntegrationWorkspacesResponseSchema.parse({
      workspaces: [
        {
          id: '16f7e90d-382a-4e78-b577-1b01eb5f8297',
          usage_limits: null,
          rate_limits: null,
          enabled: true,
          status: 'active',
          created_at: '2026-07-16T15:48:18.000Z',
          last_updated_at: '2026-07-17T12:25:22.000Z',
          last_reset_at: null,
        },
      ],
      global_workspace_access: { enabled: false, rate_limits: null, usage_limits: null },
      object: 'integration',
    });
    expect(r.global_workspace_access.enabled).toBe(false);
    expect(r.workspaces[0].enabled).toBe(true);
  });

  it('parses a deployment list row (11 fields, no credentials)', () => {
    const r = ListDeploymentsResponseSchema.parse({
      object: 'list',
      total: 1,
      data: [
        {
          id: '32e8314e-7e68-4384-aacb-a476f6c3f91d',
          name: 'talos',
          slug: 'dp-talos-f3b74e',
          type: 'production',
          status: 'active',
          created_at: '2026-07-16T15:50:06.000Z',
          last_updated_at: '2026-07-16T15:50:06.000Z',
          last_synced_at: '2026-07-27T10:27:00.000Z',
          last_resynced_at: null,
          is_default: 1,
          created_by: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
          object: 'deployment',
        },
      ],
    });
    expect(r.data[0].last_resynced_at).toBeNull();
  });

  it('parses the deployment CREATE receipt, which is NOT the record shape', () => {
    const r = GatewayDeploymentCreateResponseSchema.parse({
      id: '21414819-485e-4ba3-b3d3-3e1815580e43',
      client_auth: 'client-auth-1edUcNFlbaTSueWe5gdlcmSCHPRO',
      credentials: { username: '1852583913', password: 's3cret' },
      organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
      object: 'deployment',
    });
    expect(r.credentials.password).toBe('s3cret');
  });

  it('parses audit logs (records, not the list envelope)', () => {
    const r = GatewayAuditLogsResponseSchema.parse({
      records: [
        {
          timestamp: '2026-07-24T21:04:11.000Z',
          method: 'DELETE',
          uri: '/ai_gw/admin/v2/deployments/abc',
          request_id: '600be074-d9d6-4fca-a8ec-5090f22138d6',
          request_body: '{}',
          query_params: '{}',
          request_headers: '{}',
          user_id: 'fad91538-65a9-41f7-8b9c-6e4c0e8b9c5f',
          user_type: 'user',
          organisation_id: '80f1e8db-1efe-49a7-a45b-b45cade4d861',
          workspace_id: '',
          response_status_code: 200,
          resource_type: 'admin',
          action: '',
          client_ip: '::ffff:127.0.0.1',
          country: '',
        },
      ],
    });
    expect(r.records[0].method).toBe('DELETE');
  });
});
