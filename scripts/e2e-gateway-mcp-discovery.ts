/** @internal Populate capabilities through discovery on an owned clone. Never invokes MCP tools. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AISecSDKException, McpIntegrationCreateRequestSchema } from '../src/index.js';
import { runtimeSuite } from './e2e/gateway-runtime.js';
import { discoveryFetch, type McpHttpObservation } from './e2e/mcp-discovery-fetch.js';
import { observeGatewayFixtures } from './e2e/gateway-fixtures.js';
import { writePrivateReport } from './e2e/harness.js';

const suite = 'gateway-mcp-discovery';
assert.equal(process.env.E2E_GATEWAY_WORKSPACE ?? 'ws-develo-71f8d8', 'ws-develo-71f8d8');
const sourceUrl = process.env.E2E_MCP_SOURCE_URL ?? 'https://scm-ngfw-mcp.cdot.io/mcp';
assert(
  [
    'https://scm-ngfw-mcp.cdot.io/mcp',
    'https://panw-mcp.cdot.io/mcp',
    'http://clippy-mcp.cdot.io:8080/mcp',
  ].includes(sourceUrl),
  'MCP source must be an established credential-free integration endpoint',
);
const http: McpHttpObservation[] = [];
const observations: Record<string, unknown> = {
  http,
  toolsInvoked: 0,
  sourceHost: new URL(sourceUrl).hostname,
};
const finishFixtures = observeGatewayFixtures(suite);
try {
  await runtimeSuite(
    suite,
    async ({ harness: h, management: gw, apiKey, workspaceId, tag }) => {
      const integrations = await gw.mcpIntegrations.list();
      const source = integrations.data.find((item) => {
        const url = new URL(item.url);
        return item.auth_type === 'none' && item.transport === 'http' && url.href === sourceUrl;
      });
      assert(source, 'An established, exact, credential-free MCP source is required');
      const sourceDetail = await gw.mcpIntegrations.get(source.id);
      h.protect(sourceDetail);
      assert.equal(sourceDetail.url, sourceUrl);
      assert.equal(sourceDetail.auth_type, 'none');
      assert.equal(
        sourceDetail.secret_mappings?.length ?? 0,
        0,
        'Unresolved source secret mappings are not copied',
      );
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
            configurations: sourceDetail.configurations,
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
            assert.equal(
              after.data?.find((item) => item.name === capability.name)?.enabled,
              enabled,
            );
            return result;
          },
        );
        if (!verified) return;
      }
    },
    { requiredScopes: ['mcp.invoke'] },
  );
} finally {
  finishFixtures();
}
const report = JSON.parse(readFileSync(`artifacts/e2e/${suite}.json`, 'utf8')) as {
  startedAt: string;
  finishedAt: string;
  failed: number;
  credentialsUnchanged: boolean;
};
const evidence = {
  ...observations,
  finishedAt: report.finishedAt,
  passed: report.failed === 0 && report.credentialsUnchanged,
};
writePrivateReport(`artifacts/e2e/${suite}-observations.json`, evidence);
writePrivateReport(
  `artifacts/e2e/history/${suite}-observations-${report.startedAt.replaceAll(':', '-')}.json`,
  evidence,
);
