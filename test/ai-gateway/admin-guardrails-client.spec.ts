import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIGatewayClient } from '../../src/ai-gateway/client.js';
import { AIGatewayAdminGuardrailsClient } from '../../src/ai-gateway/admin-guardrails-client.js';

const id = '16f7e90d-382a-4e78-b577-1b01eb5f8297';
const admin = 'https://example.com/ai_gw/admin/v2';
const row = {
  id,
  name: 'Policy',
  slug: 'pg-policy',
  owner_id: id,
  created_at: '2026-09-27T00:00:00Z',
  last_updated_at: '2026-09-27T00:00:00Z',
  workspace_id: null,
};
const receipt = { id, slug: row.slug, version_id: 'v1' };
const prepare = vi.fn(async (req) => req);
let client: AIGatewayAdminGuardrailsClient;
function respond(value: unknown) {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(value)));
}
function wire() {
  const [url, init] = vi.mocked(fetch).mock.calls[0];
  return { url: new URL(String(url)), init };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  prepare.mockClear();
  client = new AIGatewayAdminGuardrailsClient({ baseUrl: admin, auth: { prepare }, numRetries: 0 });
});
afterEach(() => vi.unstubAllGlobals());

describe('explicit admin guardrails', () => {
  it('composition root wires admin separately from workspace guardrails', async () => {
    const gw = new AIGatewayClient({
      clientId: 'client',
      clientSecret: 'secret',
      tsgId: '123',
      adminEndpoint: admin,
      dataEndpoint: 'https://example.com/ai_gw/v2',
    });
    expect(gw.adminGuardrails).toBeInstanceOf(AIGatewayAdminGuardrailsClient);
    // Supply a token through the real OAuth boundary, then verify the selected URL.
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: 'fixture', expires_in: 3600, token_type: 'Bearer' }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [], total: 0 })));
    await gw.adminGuardrails.list();
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toBe(`${admin}/guardrails`);
  });
  it('lists without a workspace and preserves optional and extension response fields', async () => {
    respond({ data: [{ ...row, extra: true }], total: 1, object: 'list' });
    const result = await client.list();
    expect(result.data[0]).toEqual({ ...row, extra: true });
    expect(wire().url.href).toBe(`${admin}/guardrails`);
  });
  it('sends explicit pagination, including page zero, and optional workspace filter', async () => {
    respond({ data: [], total: 0 });
    await client.list({ workspaceId: id, pageSize: 1000, currentPage: 0 });
    expect(Object.fromEntries(wire().url.searchParams)).toEqual({
      workspace_id: id,
      page_size: '1000',
      current_page: '0',
    });
  });
  it.each([
    { pageSize: 0 },
    { pageSize: 1001 },
    { pageSize: 1.5 },
    { currentPage: -1 },
    { workspaceId: '../escape' },
    { unknown: true },
  ])('rejects invalid list input before auth: %j', async (opts) => {
    await expect(client.list(opts)).rejects.toThrow();
    expect(prepare).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts organisation detail with no workspace, checks or actions', async () => {
    respond(row);
    expect(await client.get(id)).toEqual(row);
    expect(wire().url.pathname).toBe(`/ai_gw/admin/v2/guardrails/${id}`);
  });
  it('creates without importing the workspace-only schema or requiring response object', async () => {
    respond(receipt);
    expect(
      await client.create({ name: 'Policy', target: 'mcp_tools', organisation_id: id }),
    ).toEqual(receipt);
    expect(wire().init?.method).toBe('POST');
    expect(JSON.parse(String(wire().init?.body))).toEqual({
      name: 'Policy',
      target: 'mcp_tools',
      organisation_id: id,
    });
  });
  it('rejects numeric TSG as organisation UUID before auth', async () => {
    await expect(client.create({ name: 'Policy', organisation_id: '123' })).rejects.toThrow();
    expect(prepare).not.toHaveBeenCalled();
  });
  it('updates using the admin receipt contract', async () => {
    respond({ id, slug: row.slug });
    expect(await client.update(id, { name: 'New' })).toEqual({ id, slug: row.slug });
    expect(wire().init?.method).toBe('PUT');
  });
  it('deletes only the explicitly selected admin route', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await client.delete(id);
    expect(wire().init?.method).toBe('DELETE');
    expect(wire().url.href).toBe(`${admin}/guardrails/${id}`);
  });
  it('reads and replaces MCP mappings', async () => {
    respond([]);
    expect(await client.getMcpServers(id)).toEqual([]);
    expect(wire().url.pathname).toBe(`/ai_gw/admin/v2/guardrails/${id}/mcp-servers`);
    vi.mocked(fetch).mockClear();
    const result = { changed: true, added: 0, updated: 0, removed: 1 };
    respond(result);
    expect(await client.syncMcpServers(id, { mcp_servers: {} })).toEqual(result);
    expect(wire().init?.method).toBe('PUT');
  });
  it('upserts a single MCP mapping', async () => {
    respond({ map_id: id });
    await client.upsertMcpServer(id, id, { run_on: ['input'] });
    expect(wire().url.pathname).toBe(`/ai_gw/admin/v2/guardrails/${id}/mcp-servers/${id}`);
  });
  it('rejects unsafe path IDs before auth for every path operation', async () => {
    for (const run of [
      () => client.get('../x'),
      () => client.delete('../x'),
      () => client.update('../x', { name: 'X' }),
      () => client.getMcpServers('../x'),
      () => client.syncMcpServers('../x', { mcp_servers: {} }),
      () => client.upsertMcpServer(id, '../x', {}),
    ])
      await expect(run()).rejects.toThrow();
    expect(prepare).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects invalid mapping phases and capability IDs before authentication', async () => {
    await expect(
      client.upsertMcpServer(id, id, { run_on: ['invalid'] as never }),
    ).rejects.toThrow();
    await expect(
      client.upsertMcpServer(id, id, { mcp_integration_capability_ids: ['not-a-uuid'] }),
    ).rejects.toThrow();
    await expect(
      client.syncMcpServers(id, { mcp_servers: { 'not-a-uuid': {} } }),
    ).rejects.toThrow();
    expect(prepare).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not fall back to another plane on permission denial', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{"message":"Denied"}', { status: 403 }));
    await expect(client.list()).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
