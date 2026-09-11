import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IamScopesClient } from '../../src/iam/scopes-client.js';
import type { AuthAdapter } from '../../src/http/types.js';
import { AISecSDKException } from '../../src/errors.js';

function passthroughAuth(): AuthAdapter {
  return { prepare: async (req) => req };
}
function mockFetch(data: unknown, status = 200) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(data === undefined ? '' : JSON.stringify(data)),
  });
}

// Live shape, GET /iam/v1/scopes on TSG 1852583913 (2026-09-11).
const mainScope = {
  name: 'main_airs_workspace_1852583913',
  description: 'This scope corresponds to the default workspace for this tenant.',
  resources: [{ metadata: [], resource_id: 'ws-main-a-349e0e', resource_type: 'workspace' }],
  tsg_id: '1852583913',
  id: 'main_airs_workspace_1852583913:1852583913',
};
// Captured from SCM's UI creating a workspace (2026-09-11, TSG 1001464285).
const freshScope = {
  name: 'ws_truffles_ggolfu',
  description: 'Online recipe generation application',
  resources: [],
  tsg_id: '1001464285',
  id: 'ws_truffles_ggolfu:1001464285',
};

describe('IamScopesClient', () => {
  const originalFetch = globalThis.fetch;
  let client: IamScopesClient;

  const call = (index = 0) => {
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[index] as [
      string,
      RequestInit,
    ];
    return { url, init, body: init.body ? JSON.parse(init.body as string) : undefined };
  };

  beforeEach(() => {
    client = new IamScopesClient({
      baseUrl: 'https://iam.example.com/iam/v1',
      auth: passthroughAuth(),
      numRetries: 0,
    });
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('GETs /scopes and parses the { count, items } envelope', async () => {
    mockFetch({ count: 2, items: [mainScope, freshScope] });
    const res = await client.list();
    expect(call().url).toBe('https://iam.example.com/iam/v1/scopes');
    expect(call().init.method).toBe('GET');
    expect(res.count).toBe(2);
    expect(res.items[0].resources[0].resource_id).toBe('ws-main-a-349e0e');
    expect(res.items[1].resources).toEqual([]);
  });

  it('GETs one scope by name', async () => {
    mockFetch(mainScope);
    const res = await client.get('main_airs_workspace_1852583913');
    expect(call().url).toBe('https://iam.example.com/iam/v1/scopes/main_airs_workspace_1852583913');
    expect(res.id).toBe('main_airs_workspace_1852583913:1852583913');
  });

  it.each(['ws_x/../y', 'name with space', 'ws:tsg', '', '/abs'])(
    'rejects scope name %j before issuing a request',
    async (name) => {
      globalThis.fetch = vi.fn();
      await expect(client.get(name)).rejects.toThrow(AISecSDKException);
      await expect(client.update(name, {})).rejects.toThrow(AISecSDKException);
      await expect(client.delete(name)).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );

  describe('create', () => {
    it('POSTs the exact body SCM sends, defaulting description and resources', async () => {
      mockFetch(freshScope);
      const res = await client.create({ name: 'ws_truffles_ggolfu' });
      expect(call().url).toBe('https://iam.example.com/iam/v1/scopes');
      expect(call().init.method).toBe('POST');
      expect(call().body).toEqual({ name: 'ws_truffles_ggolfu', description: '', resources: [] });
      expect(res.name).toBe('ws_truffles_ggolfu');
    });

    it('passes description and resources through, filling metadata', async () => {
      mockFetch(freshScope);
      await client.create({
        name: 'ws_truffles_ggolfu',
        description: 'Online recipe generation application',
        resources: [{ resource_type: 'workspace', resource_id: 'ws-truffl-03e7d9' }],
      });
      expect(call().body).toEqual({
        name: 'ws_truffles_ggolfu',
        description: 'Online recipe generation application',
        resources: [{ resource_type: 'workspace', resource_id: 'ws-truffl-03e7d9', metadata: [] }],
      });
    });

    it('rejects an empty name locally', async () => {
      globalThis.fetch = vi.fn();
      await expect(client.create({ name: '' })).rejects.toThrow(AISecSDKException);
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('PUTs a full replacement that repeats the name from the path', async () => {
      const bound = {
        ...freshScope,
        resources: [{ metadata: [], resource_id: 'ws-truffl-03e7d9', resource_type: 'workspace' }],
      };
      mockFetch(bound);
      const res = await client.update('ws_truffles_ggolfu', {
        description: 'Online recipe generation application',
        resources: [{ resource_type: 'workspace', resource_id: 'ws-truffl-03e7d9', metadata: [] }],
      });
      expect(call().url).toBe('https://iam.example.com/iam/v1/scopes/ws_truffles_ggolfu');
      expect(call().init.method).toBe('PUT');
      // Byte-for-byte the captured SCM request body.
      expect(call().body).toEqual({
        name: 'ws_truffles_ggolfu',
        description: 'Online recipe generation application',
        resources: [{ resource_type: 'workspace', resource_id: 'ws-truffl-03e7d9', metadata: [] }],
      });
      expect(res.resources[0].resource_id).toBe('ws-truffl-03e7d9');
    });

    it('sends empty description and resources when omitted (it is a replacement)', async () => {
      mockFetch(freshScope);
      await client.update('ws_truffles_ggolfu', {});
      expect(call().body).toEqual({ name: 'ws_truffles_ggolfu', description: '', resources: [] });
    });
  });

  describe('bindWorkspace', () => {
    it('reads the scope, appends the workspace binding, and PUTs it back', async () => {
      const bound = {
        ...freshScope,
        resources: [{ metadata: [], resource_id: 'ws-truffl-03e7d9', resource_type: 'workspace' }],
      };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(freshScope),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify(bound) });

      const res = await client.bindWorkspace('ws_truffles_ggolfu', 'ws-truffl-03e7d9');

      expect(call(0).init.method).toBe('GET');
      expect(call(1).init.method).toBe('PUT');
      expect(call(1).body).toEqual({
        name: 'ws_truffles_ggolfu',
        description: 'Online recipe generation application',
        resources: [{ resource_type: 'workspace', resource_id: 'ws-truffl-03e7d9', metadata: [] }],
      });
      expect(res.resources).toHaveLength(1);
    });

    it('preserves existing bindings and drops nothing', async () => {
      const shared = {
        ...mainScope,
        resources: [
          { resource_id: 'ws-main-a-349e0e', resource_type: 'workspace' }, // no metadata key
          { metadata: [{ k: 'v' }], resource_id: 'other', resource_type: 'something' },
        ],
      };
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify(shared) })
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify(shared) });

      await client.bindWorkspace('main_airs_workspace_1852583913', 'ws-new-123456');

      expect(call(1).body.resources).toEqual([
        { resource_type: 'workspace', resource_id: 'ws-main-a-349e0e', metadata: [] },
        { resource_type: 'something', resource_id: 'other', metadata: [{ k: 'v' }] },
        { resource_type: 'workspace', resource_id: 'ws-new-123456', metadata: [] },
      ]);
    });

    it('is idempotent: an already-bound slug is not duplicated', async () => {
      globalThis.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mainScope),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => JSON.stringify(mainScope),
        });

      await client.bindWorkspace('main_airs_workspace_1852583913', 'ws-main-a-349e0e');

      expect(call(1).body.resources).toEqual([
        { resource_type: 'workspace', resource_id: 'ws-main-a-349e0e', metadata: [] },
      ]);
    });
  });

  it('DELETEs a scope by name and resolves to void', async () => {
    mockFetch(undefined, 204);
    await expect(client.delete('ws_truffles_ggolfu')).resolves.toBeUndefined();
    expect(call().url).toBe('https://iam.example.com/iam/v1/scopes/ws_truffles_ggolfu');
    expect(call().init.method).toBe('DELETE');
  });
});
