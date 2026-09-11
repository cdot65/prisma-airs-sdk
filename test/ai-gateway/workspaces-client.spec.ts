import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIGatewayWorkspacesClient } from '../../src/ai-gateway/workspaces-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

const wsId = '16f7e90d-382a-4e78-b577-1b01eb5f8297';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

const sampleWorkspace = {
  id: wsId,
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
};

describe('AIGatewayWorkspacesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: AIGatewayWorkspacesClient;

  const calledUrl = (): string =>
    (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
  const calledInit = (): RequestInit =>
    (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;

  beforeEach(() => {
    client = new AIGatewayWorkspacesClient({
      baseUrl: 'https://gw.example.com',
      adminBaseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GETs /workspaces with no params', async () => {
    mockFetch({ object: 'list', total: 1, data: [sampleWorkspace] });
    const res = await client.list();

    expect(res.data[0].slug).toBe('ws-main-a-349e0e');
    expect(calledUrl()).toBe('https://gw.example.com/workspaces');
  });

  it('rejects a malformed workspace ref before issuing a request', async () => {
    globalThis.fetch = vi.fn();
    await expect(client.get('not a workspace!')).rejects.toThrow(AISecSDKException);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // The API accepts a slug wherever it accepts a UUID — upstream documents the path param as
  // "Workspace UUID. Workspace slug is also accepted for backward compatibility", and a bogus
  // slug returns 404 (recognised key form) rather than 400. See #213.
  it('accepts a slug as well as a UUID', async () => {
    mockFetch({ ...sampleWorkspace, defaults: null, usage_limits: null, rate_limits: null });
    await client.get('ws-produc-985697');
    expect(calledUrl()).toBe('https://gw.example.com/workspaces/ws-produc-985697');
  });

  // Found live: an archived workspace created without a description returns `description: null`,
  // and upstream declares the field `nullable: true`. The list-row schema had it non-nullable,
  // so list({ status: 'archived' }) threw. See #213.
  it('parses a null description on list rows', async () => {
    mockFetch({
      object: 'list',
      total: 1,
      data: [{ ...sampleWorkspace, description: null, status: 'archived' }],
    });
    const res = await client.list({ status: 'archived' });
    expect(res.data[0].description).toBeNull();
  });

  // Observed live: list() reports status 'active' for a workspace whose get() reports
  // status null. Both forms must parse off the detail schema. See #215.
  it.each([
    ['null', null],
    ['a string', 'active'],
  ])('parses a detail read with %s status', async (_label, status) => {
    mockFetch({
      ...sampleWorkspace,
      defaults: null,
      usage_limits: null,
      rate_limits: null,
      status,
    });
    const res = await client.get(wsId);
    expect(res.status).toBe(status);
  });

  describe('list filtering and plane selection', () => {
    it('serialises the status filter in lowercase', async () => {
      mockFetch({ object: 'list', total: 1, data: [sampleWorkspace] });
      await client.list({ status: 'archived' });
      expect(calledUrl()).toBe('https://gw.example.com/workspaces?status=archived');
    });

    // The data plane returns only workspaces the caller holds a workspace-scope grant on;
    // the admin plane returns every workspace in the tenant.
    it('targets the admin plane when asked', async () => {
      mockFetch({ object: 'list', total: 2, data: [sampleWorkspace] });
      await client.list({ plane: 'admin' });
      expect(calledUrl()).toBe('https://admin.example.com/workspaces');
    });

    it('combines plane and status', async () => {
      mockFetch({ object: 'list', total: 1, data: [sampleWorkspace] });
      await client.list({ plane: 'admin', status: 'active' });
      expect(calledUrl()).toBe('https://admin.example.com/workspaces?status=active');
    });

    it('reads a workspace through the admin plane when asked', async () => {
      mockFetch({ ...sampleWorkspace, defaults: null, usage_limits: null, rate_limits: null });
      await client.get(wsId, { plane: 'admin' });
      expect(calledUrl()).toBe(`https://admin.example.com/workspaces/${wsId}`);
    });
  });

  describe('writes (admin plane)', () => {
    it('POSTs a create to the admin plane', async () => {
      mockFetch({
        id: wsId,
        name: 'New',
        slug: 'ws-new-000000',
        description: 'x',
        created_at: '2026-08-01T19:28:31.697Z',
        last_updated_at: '2026-08-01T19:28:31.697Z',
        scope_name: 'ws_new_000000',
        object: 'workspace',
      });
      await client.create({ name: 'New', scope_name: 'ws_new_000000', description: 'x' });

      expect(calledUrl()).toBe('https://admin.example.com/workspaces');
      const init = calledInit();
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({
        name: 'New',
        scope_name: 'ws_new_000000',
        description: 'x',
      });
    });

    // Captured verbatim from a live create (TSG 1852583913, 2026-08-01). Workspaces are the
    // exception to this subsystem's "receipt, not record" write pattern — configs, guardrails,
    // providers, and deployments all return 4-5 field receipts; this returns most of the record.
    it('parses the full observed create response', async () => {
      mockFetch({
        id: 'c3caae0a-1d18-44bf-8cf1-ada3d70de91e',
        name: 'zz-sdk-probe',
        slug: 'ws-zz-sdk-8bb9ca',
        description: 'throwaway; validating SDK write paths',
        created_at: '2026-08-01T19:28:31.697Z',
        last_updated_at: '2026-08-01T19:28:31.697Z',
        defaults: { metadata: { env: 'scratch' } },
        users: [],
        scope_name: 'ws_zzsdkprobe_tmp',
        object: 'workspace',
      });

      const res = await client.create({ name: 'zz-sdk-probe', scope_name: 'ws_zzsdkprobe_tmp' });

      // Typed access, no cast — this is the point of the named schema.
      expect(res.id).toBe('c3caae0a-1d18-44bf-8cf1-ada3d70de91e');
      expect(res.slug).toBe('ws-zz-sdk-8bb9ca');
      expect(res.scope_name).toBe('ws_zzsdkprobe_tmp');
      expect(res.users).toEqual([]);
      expect(res.defaults).toEqual({ metadata: { env: 'scratch' } });
    });

    it('parses a create response with a null description', async () => {
      mockFetch({
        id: wsId,
        name: 'n',
        slug: 'ws-n-000000',
        description: null,
        created_at: '2026-08-01T19:28:31.697Z',
        last_updated_at: '2026-08-01T19:28:31.697Z',
        scope_name: 'ws_n_000000',
        object: 'workspace',
      });
      const res = await client.create({ name: 'n', scope_name: 'ws_n_000000' });
      expect(res.description).toBeNull();
    });

    it('requires name and scope_name before issuing a request', async () => {
      globalThis.fetch = vi.fn();
      await expect(
        client.create({ name: '', scope_name: 'ws_x' } as Parameters<typeof client.create>[0]),
      ).rejects.toThrow(AISecSDKException);
      await expect(
        client.create({ name: 'x', scope_name: '' } as Parameters<typeof client.create>[0]),
      ).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('PUTs an update to the admin plane', async () => {
      mockFetch({ ok: true });
      await client.update(wsId, { description: 'updated' });

      expect(calledUrl()).toBe(`https://admin.example.com/workspaces/${wsId}`);
      const init = calledInit();
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body as string)).toEqual({ description: 'updated' });
    });

    // Verified live: update returns a literal empty object and the change persists (confirmed
    // by a follow-up get). GatewayWriteResponse is the honest type for {}.
    it('parses the empty-object update response', async () => {
      mockFetch({});
      const res = await client.update(wsId, { description: 'updated via SDK' });
      expect(res).toEqual({});
    });

    // The API rejects an empty patch with AB01 "No update fields provided"; fail locally
    // instead of burning a round trip.
    it('rejects an empty update before issuing a request', async () => {
      globalThis.fetch = vi.fn();
      await expect(client.update(wsId, {})).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    // Soft delete: the row persists with status 'archived' and is retrievable via
    // list({ status: 'archived' }). Same semantics as deployments.delete().
    it('DELETEs against the admin plane with no query params', async () => {
      mockFetch({});
      await client.delete(wsId);

      expect(calledUrl()).toBe(`https://admin.example.com/workspaces/${wsId}`);
      expect(calledInit().method).toBe('DELETE');
    });

    it.each(['create', 'update', 'delete'] as const)(
      '%s rejects a malformed ref/body before issuing a request',
      async (method) => {
        globalThis.fetch = vi.fn();
        const call =
          method === 'create'
            ? client.create({ name: 'x', scope_name: '' } as Parameters<typeof client.create>[0])
            : method === 'update'
              ? client.update('not a ref!', { name: 'x' })
              : client.delete('not a ref!');
        await expect(call).rejects.toThrow(AISecSDKException);
        expect(globalThis.fetch).not.toHaveBeenCalled();
      },
    );
  });

  // Regression: usage_limits / rate_limits are ARRAYS of policy objects, not objects.
  // The original schemas were derived from a tenant whose only workspace had `null` for both,
  // so the array form was never observed and `get()` threw AISEC_RESPONSE_VALIDATION against
  // any workspace with limits configured. Payload below is captured verbatim from TSG
  // 1852583913 workspace `Production` (2026-08-01). See issue #211.
  describe('usage_limits / rate_limits shapes', () => {
    const detailBase = {
      id: wsId,
      name: 'Production',
      description: 'All production applications',
      created_at: '2026-07-31T23:48:05.000Z',
      last_updated_at: '2026-08-01T11:03:22.000Z',
      is_default: 0,
      slug: 'ws-produc-985697',
      icon: null,
      defaults: { metadata: { env: 'production' } },
    };

    it('parses populated usage_limits and rate_limits arrays', async () => {
      mockFetch({
        ...detailBase,
        usage_limits: [
          {
            id: 'cf8cfd46-d44d-44f9-92d0-c75c9fb6fab6',
            type: 'cost',
            status: 'active',
            credit_limit: 10000,
            current_usage: 0.06673187500000002,
            periodic_reset: 'weekly',
            alert_threshold: 8000,
            is_exhausted_alerts_sent: false,
            is_threshold_alerts_sent: false,
          },
        ],
        rate_limits: [{ type: 'requests', unit: 'rpm', value: 100 }],
      });

      const res = await client.get(wsId);

      const usage = res.usage_limits as Array<Record<string, unknown>>;
      expect(usage[0].type).toBe('cost');
      expect(usage[0].credit_limit).toBe(10000);
      expect(usage[0].periodic_reset).toBe('weekly');

      const rate = res.rate_limits as Array<Record<string, unknown>>;
      expect(rate[0].unit).toBe('rpm');
      expect(rate[0].value).toBe(100);
    });

    it('still parses empty arrays', async () => {
      mockFetch({ ...detailBase, usage_limits: [], rate_limits: [] });
      const res = await client.get(wsId);
      expect(res.usage_limits).toEqual([]);
      expect(res.rate_limits).toEqual([]);
    });

    it('still parses null limits', async () => {
      mockFetch({ ...detailBase, usage_limits: null, rate_limits: null });
      const res = await client.get(wsId);
      expect(res.usage_limits).toBeNull();
      expect(res.rate_limits).toBeNull();
    });

    it('still parses the object form, so no tenant regresses', async () => {
      mockFetch({
        ...detailBase,
        usage_limits: { credit_limit: 500 },
        rate_limits: { value: 10 },
      });
      const res = await client.get(wsId);
      expect(res.usage_limits).toEqual({ credit_limit: 500 });
      expect(res.rate_limits).toEqual({ value: 10 });
    });
  });
});

describe('AIGatewayWorkspacesClient.provision', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // Captured from SCM's UI on 2026-09-11 (TSG 1001464285).
  const scopeRow = {
    name: 'ws_truffles_ggolfu',
    description: 'Online recipe generation application',
    resources: [],
    tsg_id: '1001464285',
    id: 'ws_truffles_ggolfu:1001464285',
  };
  const boundScope = {
    ...scopeRow,
    resources: [{ metadata: [], resource_id: 'ws-truffl-03e7d9', resource_type: 'workspace' }],
  };
  const created = {
    id: '5f2e45ed-6b07-4229-bb16-d0cc4ee8cf0e',
    name: 'truffles',
    slug: 'ws-truffl-03e7d9',
    description: 'Online recipe generation application',
    created_at: '2026-09-11T11:13:29.091Z',
    last_updated_at: '2026-09-11T11:13:29.091Z',
    defaults: null,
    users: [],
    scope_name: 'ws_truffles_ggolfu',
    object: 'workspace',
  };

  function fakeScopes() {
    return {
      create: vi.fn().mockResolvedValue(scopeRow),
      bindWorkspace: vi.fn().mockResolvedValue(boundScope),
      delete: vi.fn().mockResolvedValue(undefined),
    };
  }
  function build(iamScopes?: ReturnType<typeof fakeScopes>) {
    return new AIGatewayWorkspacesClient({
      baseUrl: 'https://gw.example.com',
      adminBaseUrl: 'https://admin.example.com',
      auth: passthroughAuth(),
      numRetries: 0,
      iamScopes: iamScopes as unknown as import('../../src/iam/scopes-client.js').IamScopesClient,
    });
  }
  const postedBody = () =>
    JSON.parse(
      ((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit)
        .body as string,
    );

  it('runs scope create → workspace create → bind, in that order, with the given scope name', async () => {
    const scopes = fakeScopes();
    mockFetch(created);
    const order: string[] = [];
    scopes.create.mockImplementation(async () => (order.push('scope'), scopeRow));
    scopes.bindWorkspace.mockImplementation(async () => (order.push('bind'), boundScope));
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('workspace');
      return { ok: true, status: 200, text: async () => JSON.stringify(created) };
    });

    const res = await build(scopes).provision({
      name: 'truffles',
      description: 'Online recipe generation application',
      scope_name: 'ws_truffles_ggolfu',
    });

    expect(order).toEqual(['scope', 'workspace', 'bind']);
    expect(scopes.create).toHaveBeenCalledWith({
      name: 'ws_truffles_ggolfu',
      description: 'Online recipe generation application',
    });
    expect(postedBody()).toEqual({
      name: 'truffles',
      description: 'Online recipe generation application',
      scope_name: 'ws_truffles_ggolfu',
    });
    expect(scopes.bindWorkspace).toHaveBeenCalledWith('ws_truffles_ggolfu', 'ws-truffl-03e7d9');
    expect(res).toEqual({ scope: boundScope, workspace: created, scopeCreated: true });
    expect(scopes.delete).not.toHaveBeenCalled();
  });

  it('generates a ws_<name>_<suffix> scope name when none is given, and uses it everywhere', async () => {
    const scopes = fakeScopes();
    mockFetch(created);
    await build(scopes).provision({ name: 'Truffles' });

    const generated = scopes.create.mock.calls[0][0].name as string;
    expect(generated).toMatch(/^ws_truffles_[a-z0-9]{6}$/);
    expect(scopes.create).toHaveBeenCalledWith({ name: generated, description: '' });
    expect(postedBody().scope_name).toBe(generated);
    expect(scopes.bindWorkspace).toHaveBeenCalledWith(generated, 'ws-truffl-03e7d9');
  });

  it('with existingScope, skips the create step and never rolls the scope back', async () => {
    const scopes = fakeScopes();
    mockFetch(created);
    const res = await build(scopes).provision(
      { name: 'truffles', scope_name: 'ws_truffles_ggolfu' },
      { existingScope: true },
    );
    expect(scopes.create).not.toHaveBeenCalled();
    expect(scopes.bindWorkspace).toHaveBeenCalledWith('ws_truffles_ggolfu', 'ws-truffl-03e7d9');
    expect(res.scopeCreated).toBe(false);
  });

  it('with existingScope, requires scope_name before any call', async () => {
    const scopes = fakeScopes();
    globalThis.fetch = vi.fn();
    await expect(
      build(scopes).provision({ name: 'truffles' }, { existingScope: true }),
    ).rejects.toThrow(/requires scope_name/);
    expect(scopes.create).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('without an IAM scopes client, throws before any network call', async () => {
    globalThis.fetch = vi.fn();
    await expect(build(undefined).provision({ name: 'truffles' })).rejects.toThrow(
      /IAM scopes client/,
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('rolls the new scope back when workspace create fails, and says so', async () => {
    const scopes = fakeScopes();
    mockFetch({ errorCode: 'AB01', message: 'bad' }, 400);
    await expect(
      build(scopes).provision({ name: 'truffles', scope_name: 'ws_truffles_ggolfu' }),
    ).rejects.toThrow(/IAM scope ws_truffles_ggolfu was deleted again/);
    expect(scopes.delete).toHaveBeenCalledWith('ws_truffles_ggolfu');
    expect(scopes.bindWorkspace).not.toHaveBeenCalled();
  });

  it('reports a failed rollback instead of hiding the orphaned scope', async () => {
    const scopes = fakeScopes();
    scopes.delete.mockRejectedValue(new Error('405 nope'));
    mockFetch({ errorCode: 'AB01' }, 400);
    let caught: unknown;
    await build(scopes)
      .provision({ name: 'truffles', scope_name: 'ws_truffles_ggolfu' })
      .catch((e) => (caught = e));
    expect(caught).toBeInstanceOf(AISecSDKException);
    expect((caught as Error).message).toMatch(/is still present/);
    expect((caught as Error).message).toMatch(/rollback failed: 405 nope/);
    expect((caught as Error).message).toMatch(/existingScope/);
    expect((caught as AISecSDKException).statusCode).toBe(400);
  });

  it('does not touch a pre-existing scope when workspace create fails under existingScope', async () => {
    const scopes = fakeScopes();
    mockFetch({ errorCode: 'AB01' }, 400);
    await expect(
      build(scopes).provision(
        { name: 'truffles', scope_name: 'ws_truffles_ggolfu' },
        { existingScope: true },
      ),
    ).rejects.toThrow(AISecSDKException);
    expect(scopes.delete).not.toHaveBeenCalled();
  });

  it('names the created workspace and scope when the bind step fails', async () => {
    const scopes = fakeScopes();
    scopes.bindWorkspace.mockRejectedValue(
      Object.assign(new Error('403 denied'), { statusCode: 403 }),
    );
    mockFetch(created);
    let caught: unknown;
    await build(scopes)
      .provision({ name: 'truffles', scope_name: 'ws_truffles_ggolfu' })
      .catch((e) => (caught = e));
    expect((caught as Error).message).toContain('ws-truffl-03e7d9');
    expect((caught as Error).message).toContain('5f2e45ed-6b07-4229-bb16-d0cc4ee8cf0e');
    expect((caught as Error).message).toContain(
      "iamScopes.bindWorkspace('ws_truffles_ggolfu', 'ws-truffl-03e7d9')",
    );
    expect((caught as AISecSDKException).statusCode).toBe(403);
    // The workspace is not archived on a bind failure — it is real and recoverable.
    expect(scopes.delete).not.toHaveBeenCalled();
  });

  it('carries non-Error rejections through as text', async () => {
    const scopes = fakeScopes();
    scopes.bindWorkspace.mockRejectedValue('string failure');
    mockFetch(created);
    await expect(
      build(scopes).provision({ name: 'truffles', scope_name: 'ws_truffles_ggolfu' }),
    ).rejects.toThrow(/string failure/);
  });
});
