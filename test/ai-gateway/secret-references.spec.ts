import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayClient, ErrorType, redactAIGatewaySecrets } from '../../src/index.js';
import { AIGatewaySecretReferencesClient } from '../../src/ai-gateway/secret-references-client.js';
import fixture from './fixtures/secret-references.json';
import { GatewaySecretReferencesClientCreateRequestSchema } from '../../src/models/ai-gateway-extensions.js';

const body = {
  name: 'sdk-fixture',
  manager_type: 'aws_sm',
  auth_config: {
    aws_auth_type: 'accessKey',
    aws_access_key_id: 'invalid-fixture-key',
    aws_secret_access_key: 'invalid-fixture-secret',
    aws_region: 'us-east-1',
  },
  secret_path: 'fixture/never-resolve',
  allow_all_workspaces: false,
  allowed_workspaces: ['11111111-1111-4111-8111-111111111111'],
};
function client(response: unknown, status = 200) {
  const fetch = vi
    .fn()
    .mockImplementation(
      async (url: string) =>
        new Response(
          JSON.stringify(
            url.includes('/token')
              ? { access_token: 'test-oauth-token', token_type: 'Bearer', expires_in: 3600 }
              : response,
          ),
          { status: url.includes('/token') ? 200 : status },
        ),
    );
  vi.stubGlobal('fetch', fetch);
  const gw = new AIGatewayClient({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    tsgId: '1234567890',
    tokenEndpoint: 'https://auth.example.test/token',
    adminEndpoint: 'https://admin.example.test/ai_gw/admin/v2',
    dataEndpoint: 'https://data.example.test/ai_gw/v2',
    numRetries: 0,
  });
  return { gw, fetch };
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('SCM secret references', () => {
  it('rejects URL-normalized dot segments across generated SCM resource clients before OAuth', async () => {
    const { gw, fetch } = client({});
    for (const resource of [
      'secretReferences',
      'mcpServers',
      'usageLimits',
      'rateLimits',
      'logExports',
    ] as const)
      for (const id of ['.', '..'])
        await expect(gw[resource].get(id)).rejects.toMatchObject({
          errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
        });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    [
      'aws_sm',
      {
        aws_auth_type: 'accessKey',
        aws_access_key_id: 'fixture',
        aws_secret_access_key: 'fixture',
        aws_region: 'us-east-1',
      },
    ],
    ['aws_sm', { aws_auth_type: 'assumedRole', aws_role_arn: 'fixture', aws_region: 'us-east-1' }],
    ['aws_sm', { aws_auth_type: 'serviceRole' }],
    [
      'azure_kv',
      {
        azure_auth_mode: 'entra',
        azure_entra_tenant_id: 'fixture',
        azure_entra_client_id: 'fixture',
        azure_entra_client_secret: 'fixture',
        azure_vault_url: 'https://example.invalid',
      },
    ],
    ['azure_kv', { azure_auth_mode: 'managed', azure_vault_url: 'https://example.invalid' }],
    ['azure_kv', { azure_auth_mode: 'default', azure_vault_url: 'https://example.invalid' }],
    [
      'hashicorp_vault',
      { vault_auth_type: 'token', vault_addr: 'https://example.invalid', vault_token: 'fixture' },
    ],
    [
      'hashicorp_vault',
      {
        vault_auth_type: 'approle',
        vault_addr: 'https://example.invalid',
        vault_role_id: 'fixture',
        vault_secret_id: 'fixture',
      },
    ],
    [
      'hashicorp_vault',
      {
        vault_auth_type: 'kubernetes',
        vault_addr: 'https://example.invalid',
        vault_role: 'fixture',
      },
    ],
  ])('validates the pinned %s authentication variant: %j', (manager_type, auth_config) => {
    expect(
      GatewaySecretReferencesClientCreateRequestSchema.safeParse({
        ...body,
        manager_type,
        auth_config,
      }).success,
    ).toBe(true);
  });
  it.each([
    { ...body, manager_type: 'azure_kv' },
    { ...body, manager_type: 'hashicorp_vault' },
    { ...body, allow_all_workspaces: true },
  ])('rejects mismatched manager or conflicting access scope: %j', async (input) => {
    const { gw, fetch } = client({});
    await expect(gw.secretReferences.create(input)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{}, { allow_all_workspaces: true, allowed_workspaces: ['fixture'] }])(
    'rejects empty or contradictory updates: %j',
    async (input) => {
      const { gw, fetch } = client({});
      await expect(gw.secretReferences.update('owned', input)).rejects.toMatchObject({
        errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
      });
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['list', 'GET', '/secret-references', fixture.list],
    ['create', 'POST', '/secret-references', fixture.create],
    ['get', 'GET', '/secret-references/sdk-fixture', fixture.detail],
    ['update', 'PUT', '/secret-references/sdk-fixture', fixture.update],
    ['delete', 'DELETE', '/secret-references/sdk-fixture', fixture.delete],
  ] as const)(
    'routes %s through admin OAuth and TSG, without runtime auth',
    async (method, verb, path, response) => {
      const { gw, fetch } = client(response);
      expect(gw.secretReferences).toBeInstanceOf(AIGatewaySecretReferencesClient);
      const result =
        method === 'list'
          ? await gw.secretReferences.list()
          : method === 'create'
            ? await gw.secretReferences.create(body)
            : method === 'update'
              ? await gw.secretReferences.update('sdk-fixture', { description: 'Updated' })
              : await gw.secretReferences[method]('sdk-fixture');
      expect(result).toEqual(response);
      const [url, init] = fetch.mock.calls.at(-1)!;
      expect(url).toBe(`https://admin.example.test/ai_gw/admin/v2${path}`);
      expect(init.method).toBe(verb);
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-oauth-token');
      expect(new Headers(init.headers).get('x-tsg-id')).toBe('1234567890');
      expect(new Headers(init.headers).has('x-portkey-api-key')).toBe(false);
      expect(init.body).toBe(
        method === 'create'
          ? JSON.stringify(body)
          : method === 'update'
            ? JSON.stringify({ description: 'Updated' })
            : undefined,
      );
    },
  );
  it('serializes zero-based pagination and JSON tag filters without a workspace query', async () => {
    const { gw, fetch } = client(fixture.list);
    await gw.secretReferences.list({
      current_page: 0,
      page_size: 100,
      tags: '{"team":"R&D"}',
      search: 'sdk fixture',
      manager_type: 'aws_sm',
    });
    expect(Object.fromEntries(new URL(fetch.mock.calls.at(-1)![0]).searchParams)).toEqual({
      current_page: '0',
      page_size: '100',
      tags: '{"team":"R&D"}',
      search: 'sdk fixture',
      manager_type: 'aws_sm',
    });
  });
  it.each([
    { current_page: -1 },
    { page_size: 0 },
    { page_size: 101 },
    { page_size: 1.5 },
    { search: '' },
    { workspace_id: 'dev' },
  ])('rejects invalid list options before OAuth: %j', async (options) => {
    const { gw, fetch } = client(fixture.list);
    await expect(gw.secretReferences.list(options)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['get', 'update', 'delete'] as const)(
    'rejects empty %s identity before OAuth',
    async (method) => {
      const { gw, fetch } = client({});
      await expect(
        method === 'update' ? gw.secretReferences.update('', {}) : gw.secretReferences[method](''),
      ).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
  it('encodes slug path segments without interpreting delimiters', async () => {
    const { gw, fetch } = client(fixture.detail);
    await gw.secretReferences.get('a/b?#');
    expect(fetch.mock.calls.at(-1)![0]).toBe(
      'https://admin.example.test/ai_gw/admin/v2/secret-references/a%2Fb%3F%23',
    );
  });
  it.each([
    { ...body, name: '' },
    { ...body, manager_typo: true },
    { ...body, auth_config: { aws_auth_type: 'accessKey' } },
    { ...body, allowed_workspaces: [] },
  ])('rejects malformed create bodies before authentication: %j', async (input) => {
    const { gw, fetch } = client({});
    await expect(gw.secretReferences.create(input)).rejects.toMatchObject({
      errorType: ErrorType.USER_REQUEST_PAYLOAD_ERROR,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports HTTP failure without accepting it as a response model', async () => {
    const { gw } = client({ error: 'forbidden' }, 403);
    await expect(gw.secretReferences.list()).rejects.toMatchObject({
      statusCode: 403,
      failureKind: 'http',
    });
  });
  it('rejects a mistyped response while preserving additive response fields', async () => {
    const { gw } = client({ ...fixture.list, total: 'zero' });
    await expect(gw.secretReferences.list()).rejects.toMatchObject({
      errorType: ErrorType.RESPONSE_VALIDATION,
    });
    const next = client({ ...fixture.detail, future_field: true });
    expect((await next.gw.secretReferences.get('sdk-fixture')).future_field).toBe(true);
  });
  it('omits request and response bodies even with sensitive debug enabled', async () => {
    vi.stubEnv('PANW_AI_SEC_DEBUG', '1');
    vi.stubEnv('PANW_AI_SEC_DEBUG_BODY', '1');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { gw } = client({
      ...fixture.detail,
      auth_config: { credential: 'response-private-marker' },
    });
    await gw.secretReferences.create(body);
    await gw.secretReferences.get('sdk-fixture');
    const output = JSON.stringify(log.mock.calls);
    expect(output).not.toContain('invalid-fixture-secret');
    expect(output).not.toContain('response-private-marker');
    expect(output).not.toContain('test-oauth-token');
  });
  it('exposes subtree redaction for CLI consumers without modifying their input', () => {
    expect(redactAIGatewaySecrets('secretReferences.create', body, 'request').auth_config).toBe(
      '[REDACTED]',
    );
    expect(
      redactAIGatewaySecrets('secretReferences.get', fixture.detail, 'response').auth_config,
    ).toBe('[REDACTED]');
    expect(body.auth_config.aws_secret_access_key).toBe('invalid-fixture-secret');
  });
});
