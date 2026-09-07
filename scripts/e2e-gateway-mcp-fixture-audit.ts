/** @internal Independently verify every public/synthetic MCP fixture, including implicit servers. */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { AIGatewayClient, AISecSDKException } from '../src/index.js';
import { loadLiveCredentials } from './live-credentials.js';
import { LiveHarness } from './e2e/harness.js';
import { getSyntheticKubeObject, syntheticKubeKind } from './e2e/synthetic-mcp-kubernetes.js';

type Fixture = { resource: string; id: string; name: string };
const reports = readdirSync('artifacts/e2e/history').filter((name) =>
  /^gateway-mcp-(?:public|synthetic|metadata)-\d{4}-.*\.json$/.test(name),
);
assert(reports.length > 0);
const fixtures = new Map<string, Fixture>();
for (const file of reports) {
  const report = JSON.parse(readFileSync(`artifacts/e2e/history/${file}`, 'utf8')) as {
    fixtures: Fixture[];
  };
  const key = report.fixtures.find((item) => item.resource === 'gateway.service-api-key');
  assert(key && /^sdk-e2e-inference-[0-9a-f]{8}$/.test(key.name));
  for (const item of report.fixtures) {
    assert(
      [
        key.name,
        `${key.name}-mcp`,
        `${key.name}-integration`,
        `sdk-e2e-mcp-${key.name.slice(-8)}`,
      ].includes(item.name),
    );
    fixtures.set(`${item.resource}:${item.id}`, item);
  }
}
const credentials = loadLiveCredentials();
const h = new LiveHarness();
const gw = new AIGatewayClient({ numRetries: 0 });
try {
  const workspace = await gw.workspaces.get('ws-develo-71f8d8');
  const keys = await gw.apiKeys.listService({ workspaceId: workspace.id });
  h.protect(keys);
  const integrations = await gw.mcpIntegrations.list();
  assert.equal(keys.data.length, keys.total);
  assert.equal(integrations.data.length, integrations.total);
  let index = 0;
  for (const item of fixtures.values()) {
    await h.check(`mcp-fixture-audit.${++index}.${item.resource}.absent`, async () => {
      const kind = syntheticKubeKind(item.resource);
      if (kind) assert.equal(await getSyntheticKubeObject(kind, item.name), undefined);
      else if (item.resource === 'gateway.service-api-key')
        assert(!keys.data.some((key) => key.id === item.id));
      else if (item.resource === 'gateway.mcp-integration')
        assert(!integrations.data.some((integration) => integration.id === item.id));
      else if (item.resource === 'gateway.mcp-server')
        await assert.rejects(
          () => gw.mcpServers.get(item.id),
          (error: unknown) => error instanceof AISecSDKException && error.statusCode === 404,
        );
      else throw new Error('Unknown MCP fixture type');
      return { absent: true };
    });
  }
  await h.check('mcp-fixture-audit.implicit-servers-absent', async () => {
    const owned = new Set(
      [...fixtures.values()]
        .filter((item) => item.resource === 'gateway.mcp-integration')
        .map((item) => item.id),
    );
    const servers = await gw.mcpServers.list({
      workspace_id: workspace.id,
      page_size: 100,
      current_page: 0,
    });
    assert.equal(servers.data?.length, servers.total);
    assert(servers.data?.every((item) => !owned.has(item.mcp_integration_id ?? '')));
    return { absentFromCompleteInventory: true };
  });
} catch (error) {
  await h.check('mcp-fixture-audit.prerequisites', async () => {
    throw error;
  });
} finally {
  credentials.verifyUnchanged();
  h.finish('gateway-mcp-fixture-audit', true);
}
