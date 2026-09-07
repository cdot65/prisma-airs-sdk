/** @internal Shared owned MCP server lifecycle; never invokes upstream tools. */
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AISecSDKException, McpIntegrationCreateRequestSchema } from '../../src/index.js';
import { runtimeSuite } from './gateway-runtime.js';
import { discoveryFetch, type McpHttpObservation } from './mcp-discovery-fetch.js';
import { exerciseMcpMetadata } from './mcp-metadata.js';
type Context = Parameters<Parameters<typeof runtimeSuite>[1]>[0];
export async function exerciseOwnedMcp(
  { harness: h, management: gw, apiKey, workspaceId, tag }: Context,
  source: { url: string; configurations: Record<string, unknown> },
  observations: Record<string, unknown>,
  http: McpHttpObservation[],
  options: { metadataVariants?: boolean } = {},
): Promise<void> {
  const slug = `${tag}-mcp`;
  const integrationSlug = `${tag}-integration`;
  const integration = await h.check('mcp.integration-create-owned', () =>
    gw.mcpIntegrations.create(
      McpIntegrationCreateRequestSchema.parse({
        name: integrationSlug,
        slug: integrationSlug,
        organisation_id: process.env.PANW_MGMT_TSG_ID!,
        url: source.url,
        auth_type: 'none',
        transport: 'http',
        configurations: source.configurations,
      }),
    ),
  );
  assert(typeof integration?.id === 'string');
  const integrationId = integration.id;
  h.own('gateway.mcp-integration', integrationId, integrationSlug);
  h.defer('mcp.integration-deleted', () => gw.mcpIntegrations.delete(integrationId));
  const bound = await h.check('mcp.integration-bind-only-dev', async () => {
    await gw.mcpIntegrations.setWorkspaces(integrationId, {
      workspaces: [{ id: workspaceId, enabled: true }],
      global_workspace_access: { enabled: false },
    });
    return true;
  });
  if (!bound) return;
  const server = await h.check('mcp.server-create-owned', () =>
    gw.mcpServers.create({
      name: slug,
      slug,
      workspace_id: workspaceId,
      mcp_integration_id: integrationId,
    }),
  );
  assert(server?.id);
  const serverId = server.id;
  h.own('gateway.mcp-server', serverId, slug);
  h.defer('mcp.server-deleted-and-verified', async () => {
    await gw.mcpServers.delete(serverId);
    await assert.rejects(
      () => gw.mcpServers.get(serverId),
      (error: unknown) => error instanceof AISecSDKException && error.statusCode === 404,
    );
  });
  const assertOwned = async () => {
    const current = await gw.mcpServers.get(serverId);
    assert.equal(current.id, serverId);
    assert.equal(current.slug, slug);
    assert.equal(current.name, slug);
    assert.equal(current.mcp_integration_id, integrationId);
    // This deployment's detail response omits workspace/integration details.
    // Prove those boundaries through their authoritative reads, not optional fields.
    const scoped = await gw.mcpServers.list({
      workspace_id: workspaceId,
      id: serverId,
      page_size: 100,
    });
    const row = scoped.data?.find((item) => item.id === serverId);
    assert(row, 'Owned server must be present in the exact dev workspace');
    assert.equal(row.workspace_id, workspaceId);
    assert.equal(row.mcp_integration_id, integrationId);
    const integrationDetail = await gw.mcpIntegrations.get(integrationId);
    assert.equal(integrationDetail.id, integrationId);
    assert.equal(integrationDetail.slug, integrationSlug);
    assert.equal(integrationDetail.url, source.url);
    assert.equal(integrationDetail.auth_type, 'none');
    assert.equal(integrationDetail.global_workspace_access?.enabled, false);
    return current;
  };
  if (!(await h.check('mcp.verify-owned-boundary', assertOwned))) return;
  await h.check('mcp.capability-baseline', async () => {
    const before = await gw.mcpServers.getCapabilities(serverId, {
      page: 1,
      page_size: 500,
      type: 'tool',
    });
    observations.capabilitiesBefore = before.total;
    return before;
  });

  const endpoint = new URL(`https://mcp-airs.cdot.io/${slug}/mcp`);
  const transport = new StreamableHTTPClientTransport(endpoint, {
    requestInit: { headers: { 'x-portkey-api-key': apiKey } },
    fetch: discoveryFetch(endpoint, http),
    reconnectionOptions: {
      maxRetries: 0,
      initialReconnectionDelay: 1000,
      maxReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1,
    },
  });
  const client = new Client(
    { name: 'prisma-airs-sdk-owned-discovery', version: '0.21.0' },
    { capabilities: {} },
  );
  h.defer('mcp.session-closed', async () => {
    try {
      observations.sessionIssued = !!transport.sessionId;
      if (transport.sessionId) {
        await transport.terminateSession();
        const deletion = [...http].reverse().find((item) => item.method === 'DELETE');
        observations.sessionTerminationStatus = deletion?.status;
        assert(
          deletion && deletion.status >= 200 && deletion.status < 300,
          'Session termination not confirmed',
        );
      }
    } finally {
      await client.close();
    }
  });
  const connected = await h.check('mcp.initialize-owned-runtime', async () => {
    await client.connect(transport, { timeout: 20_000, maxTotalTimeout: 20_000 });
    observations.protocolVersion = transport.protocolVersion;
    assert(client.getServerCapabilities()?.tools, 'Server must advertise tool discovery');
    return true;
  });
  if (!connected) return;
  if (options.metadataVariants) {
    await exerciseMcpMetadata({
      harness: h,
      management: gw,
      client,
      serverId,
      assertOwned,
      observations,
    });
    return;
  }
  const names = await h.check('mcp.list-tools-without-invocation', async () => {
    const result = await client.listTools({}, { timeout: 20_000, maxTotalTimeout: 20_000 });
    assert(result.tools.length > 0, 'Owned server advertised no tools');
    observations.discoveredToolsFirstPage = result.tools.length;
    observations.moreToolsAvailable = !!result.nextCursor;
    return new Set(result.tools.map((tool) => tool.name));
  });
  if (!names) return;
  const capability = await h.check('mcp.discover-populated-SCM-capability', async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const result = await gw.mcpServers.getCapabilities(serverId, {
        page: 1,
        page_size: 500,
        type: 'tool',
      });
      observations.capabilitiesAfter = result.total;
      const match = result.data?.find(
        (item) =>
          item.type === 'tool' && item.name && names.has(item.name) && item.enabled === true,
      );
      if (match) return match;
      await delay(2000);
    }
    throw new Error(
      'No enabled SCM capability matched the runtime discovery within the bounded run',
    );
  });
  if (!capability?.name) return;
  observations.runtimeToolCounts = [names.size];
  for (const enabled of [false, true]) {
    const verified = await h.check(
      `mcp.capability-${enabled ? 'enable' : 'disable'}-owned`,
      async () => {
        await assertOwned();
        const result = await gw.mcpServers.updateCapabilities(serverId, {
          capabilities: [{ name: capability.name!, type: 'tool', enabled }],
        });
        const after = await gw.mcpServers.getCapabilities(serverId, {
          page: 1,
          page_size: 500,
          type: 'tool',
        });
        assert.equal(after.data?.find((item) => item.name === capability.name)?.enabled, enabled);
        observations.capabilityStates = [
          ...((observations.capabilityStates as boolean[] | undefined) ?? []),
          enabled,
        ];
        return result;
      },
    );
    if (!verified) return;
    const enforced = await h.check(
      `mcp.runtime-tool-${enabled ? 'visible' : 'hidden'}`,
      async () => {
        // The verified 2.20.0 gateway caches disabled-capability lookups for 300s.
        // Observe natural expiry; never flush shared caches or change runtime policy.
        const started = Date.now();
        const deadline = started + 330_000;
        while (Date.now() < deadline) {
          const timeout = Math.min(20_000, deadline - Date.now());
          const current = await client.listTools({}, { timeout, maxTotalTimeout: timeout });
          const visible = new Set(current.tools.map((item) => item.name));
          console.log(
            JSON.stringify({
              phase: 'mcp.visibility-propagation',
              desired: enabled,
              visible: visible.has(capability.name!),
              elapsedMs: Date.now() - started,
              count: visible.size,
            }),
          );
          if (visible.has(capability.name!) === enabled) {
            for (const name of names)
              if (name !== capability.name)
                assert(visible.has(name), 'An unrelated capability disappeared');
            observations.runtimeToolCounts = [
              ...(observations.runtimeToolCounts as number[]),
              visible.size,
            ];
            observations.runtimeCapabilityStates = [
              ...((observations.runtimeCapabilityStates as boolean[] | undefined) ?? []),
              visible.has(capability.name!),
            ];
            return { visible: enabled, count: visible.size };
          }
          await delay(Math.min(30_000, Math.max(0, deadline - Date.now())));
        }
        throw new Error('Runtime tool visibility did not reflect the owned capability setting');
      },
    );
    if (!enforced) return;
  }
}
